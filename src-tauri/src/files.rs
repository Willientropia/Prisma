//! Arquivos soltos, como num programa CAD (ADENDO 01, A4 e A8): ler, gravar, observar.
//! Caminhos absolutos. Só extensões conhecidas, para um bug na interface não virar acesso a qualquer arquivo.
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Emitter, State};

pub type Res<T> = Result<T, String>;
pub fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

const EXTENSIONS: &[&str] = &["prsm", "prsf", "prsl", "prst", "prsp", "tex", "bib", "cls", "sty", "md", "txt"];

/// Caminho absoluto com extensão permitida (ou `.gitignore`).
pub fn checked(path: &str) -> Res<PathBuf> {
    let p = PathBuf::from(path);
    if !p.is_absolute() {
        return Err(format!("Caminho precisa ser absoluto: {path}"));
    }
    let name = p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    let ext = p.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
    if name == ".gitignore" || EXTENSIONS.contains(&ext.as_str()) {
        Ok(p)
    } else {
        Err(format!("Tipo de arquivo não permitido: {name}"))
    }
}

pub fn mtime(p: &Path) -> Option<u64> {
    let t = fs::metadata(p).ok()?.modified().ok()?;
    Some(t.duration_since(UNIX_EPOCH).ok()?.as_millis() as u64)
}

/// Grava num temporário ao lado e renomeia: uma queda no meio não deixa o arquivo pela metade.
pub fn write_atomic(path: &Path, content: &str) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".prisma-tmp");
    fs::write(&tmp, content)?;
    fs::rename(&tmp, path)
}

/// Chave para comparar caminhos vindos do sistema e da interface (barra normal; sem caixa no Windows).
fn key(p: &Path) -> String {
    let s = p.to_string_lossy().replace('\\', "/");
    if cfg!(windows) { s.to_lowercase() } else { s }
}

#[tauri::command]
pub fn file_read(path: String) -> Res<String> {
    fs::read_to_string(checked(&path)?).map_err(err)
}

#[tauri::command]
pub fn file_write(path: String, content: String) -> Res<()> {
    write_atomic(&checked(&path)?, &content).map_err(err)
}

/// Data de modificação de cada caminho (null = não existe).
#[tauri::command]
pub fn file_stat(paths: Vec<String>) -> Vec<Option<u64>> {
    paths.iter().map(|p| mtime(Path::new(p))).collect()
}

/// Nomes dos arquivos de uma pasta (sem subpastas), para resolver [[links]].
#[tauri::command]
pub fn dir_list(path: String) -> Res<Vec<String>> {
    let mut out: Vec<String> = fs::read_dir(&path)
        .map_err(err)?
        .flatten()
        .filter(|e| e.path().is_file())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .collect();
    out.sort();
    Ok(out)
}

#[tauri::command]
pub fn file_rename(from: String, to: String) -> Res<()> {
    let (a, b) = (checked(&from)?, checked(&to)?);
    if b.exists() {
        return Err(format!("Já existe um arquivo com esse nome: {}", b.display()));
    }
    fs::rename(a, b).map_err(err)
}

/// Observa os arquivos abertos. Observa a pasta de cada um (editores costumam gravar por troca de arquivo).
#[derive(Default)]
pub struct Watch {
    watcher: Mutex<Option<RecommendedWatcher>>,
}

#[tauri::command]
pub fn watch_set(app: AppHandle, state: State<Watch>, paths: Vec<String>) -> Res<()> {
    let wanted: Arc<HashMap<String, String>> = Arc::new(paths.iter().map(|p| (key(Path::new(p)), p.clone())).collect());
    let dirs: HashSet<PathBuf> = paths.iter().filter_map(|p| Path::new(p).parent().map(Path::to_path_buf)).filter(|d| d.is_dir()).collect();

    let map = wanted.clone();
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        let Ok(ev) = res else { return };
        if !matches!(ev.kind, EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)) {
            return;
        }
        for p in &ev.paths {
            if let Some(original) = map.get(&key(p)) {
                let _ = app.emit("file-changed", original.clone());
            }
        }
    })
    .map_err(err)?;
    for d in &dirs {
        watcher.watch(d, RecursiveMode::NonRecursive).map_err(err)?;
    }
    *state.watcher.lock().unwrap() = Some(watcher); // substitui (e encerra) o anterior
    Ok(())
}

#[cfg(test)]
pub mod tests {
    use super::*;

    pub fn tmp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("prisma-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn so_extensoes_conhecidas_e_caminho_absoluto() {
        let d = tmp("checked");
        for ok in ["a.prsm", "b.PRSF", "c.prsl", "d.prst", "e.prsp", "f.tex", ".gitignore"] {
            assert!(checked(&d.join(ok).to_string_lossy()).is_ok(), "{ok}");
        }
        for bad in ["x.exe", "y.dll", "sem-extensao"] {
            assert!(checked(&d.join(bad).to_string_lossy()).is_err(), "{bad}");
        }
        assert!(checked("relativo/a.prsm").is_err());
        fs::remove_dir_all(d).unwrap();
    }

    #[test]
    fn gravacao_preserva_bytes_e_renomeia() {
        let d = tmp("write");
        let a = d.join("sub/a.prsm");
        let text = "---\ntipo: caderno\n---\nΔV := 1 V\n";
        write_atomic(&a, text).unwrap();
        assert_eq!(fs::read(&a).unwrap(), text.as_bytes());
        assert!(!d.join("sub/a.prsm.prisma-tmp").exists());
        let b = d.join("sub/b.prsm");
        file_rename(a.to_string_lossy().into(), b.to_string_lossy().into()).unwrap();
        assert!(b.exists() && !a.exists());
        assert_eq!(file_stat(vec![b.to_string_lossy().into(), a.to_string_lossy().into()]).iter().map(Option::is_some).collect::<Vec<_>>(), vec![true, false]);
        fs::remove_dir_all(d).unwrap();
    }
}
