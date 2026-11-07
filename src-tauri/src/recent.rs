//! Recentes em %APPDATA%\Prisma\recentes.json (ADENDO 01, A3): caminho absoluto, tipo e data; até 30.
use crate::appdata::config_dir;
use crate::files::{err, mtime, write_atomic, Res};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

const MAX: usize = 30;

#[derive(Serialize, Deserialize, Clone)]
pub struct Recent {
    path: String,
    tipo: String,
    data: u64,
    /// Data de modificação no disco; null = arquivo não existe mais. Não é gravada.
    #[serde(default, skip_deserializing)]
    modified: Option<u64>,
}

fn store(app: &AppHandle) -> Res<PathBuf> {
    Ok(config_dir(app)?.join("recentes.json"))
}

fn load(file: &Path) -> Vec<Recent> {
    std::fs::read_to_string(file).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn save(file: &Path, list: &[Recent]) -> Res<()> {
    write_atomic(file, &serde_json::to_string_pretty(list).map_err(err)?).map_err(err)
}

fn with_mtime(mut list: Vec<Recent>) -> Vec<Recent> {
    for r in &mut list {
        r.modified = mtime(Path::new(&r.path));
    }
    list
}

/// Põe no topo, sem duplicar, e corta em 30.
fn push(mut list: Vec<Recent>, path: String, tipo: String, data: u64) -> Vec<Recent> {
    list.retain(|r| r.path != path);
    list.insert(0, Recent { path, tipo, data, modified: None });
    list.truncate(MAX);
    list
}

#[tauri::command]
pub fn recent_list(app: AppHandle) -> Res<Vec<Recent>> {
    Ok(with_mtime(load(&store(&app)?)))
}

#[tauri::command]
pub fn recent_add(app: AppHandle, path: String, tipo: String) -> Res<Vec<Recent>> {
    let file = store(&app)?;
    let now = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);
    let list = push(load(&file), path, tipo, now);
    save(&file, &list)?;
    Ok(with_mtime(list))
}

#[tauri::command]
pub fn recent_remove(app: AppHandle, path: String) -> Res<Vec<Recent>> {
    let file = store(&app)?;
    let mut list = load(&file);
    list.retain(|r| r.path != path);
    save(&file, &list)?;
    Ok(with_mtime(list))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn topo_sem_duplicar_e_maximo_30() {
        let mut l = Vec::new();
        for i in 0..40 {
            l = push(l, format!("C:/x/{i}.prsm"), "caderno".into(), i);
        }
        assert_eq!(l.len(), 30);
        assert_eq!(l[0].path, "C:/x/39.prsm");
        l = push(l, "C:/x/20.prsm".into(), "caderno".into(), 99);
        assert_eq!(l.len(), 30);
        assert_eq!((l[0].path.as_str(), l[0].data), ("C:/x/20.prsm", 99));
        assert_eq!(l.iter().filter(|r| r.path == "C:/x/20.prsm").count(), 1);
    }
}
