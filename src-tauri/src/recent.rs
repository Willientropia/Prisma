//! Lista de recentes, guardada no diretório de dados do app (fora do cofre).
use crate::vault::{mtime, resolve, write_atomic};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

const MAX: usize = 20;

#[derive(Serialize, Deserialize, Clone)]
pub struct Recent {
    vault: String,
    path: String,
    opened: u64,
    #[serde(default, skip_deserializing)]
    modified: Option<u64>,
}

fn store(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.join("recent.json"))
}

fn load(file: &Path) -> Vec<Recent> {
    std::fs::read_to_string(file).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

fn with_mtime(mut list: Vec<Recent>) -> Vec<Recent> {
    for r in &mut list {
        r.modified = resolve(Path::new(&r.vault), &r.path).ok().and_then(|p| mtime(&p));
    }
    list
}

#[tauri::command]
pub fn recent_list(app: AppHandle) -> Result<Vec<Recent>, String> {
    Ok(with_mtime(load(&store(&app)?)))
}

#[tauri::command]
pub fn recent_add(app: AppHandle, vault: String, path: String) -> Result<Vec<Recent>, String> {
    let file = store(&app)?;
    let opened = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0);
    let mut list = load(&file);
    list.retain(|r| !(r.vault == vault && r.path == path));
    list.insert(0, Recent { vault, path, opened, modified: None });
    list.truncate(MAX);
    write_atomic(&file, &serde_json::to_string_pretty(&list).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    Ok(with_mtime(list))
}
