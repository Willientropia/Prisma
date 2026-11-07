//! Cofre: pasta comum com os arquivos do usuário (SPEC 3.1).
//! Todo caminho vindo do frontend é relativo ao cofre e não pode sair dele.
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Emitter, State};

#[derive(Default)]
pub struct Vault {
    root: Mutex<Option<PathBuf>>,
    watcher: Mutex<Option<RecommendedWatcher>>,
}

#[derive(Serialize)]
pub struct Entry {
    path: String,
    modified: u64,
}

const CONFIG: &str = "# Configuração do cofre Prisma
unidades: SI
casas_decimais: 2
separador_decimal: \",\"
motor_latex: tectonic
tema: grafite-violeta
";
const IGNORE_LINE: &str = ".prisma/cache/";

type Res<T> = Result<T, String>;
fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

pub fn mtime(p: &Path) -> Option<u64> {
    let t = fs::metadata(p).ok()?.modified().ok()?;
    Some(t.duration_since(UNIX_EPOCH).ok()?.as_millis() as u64)
}

/// Junta um caminho relativo ao cofre, recusando absolutos, `..` e prefixos de unidade.
pub fn resolve(root: &Path, rel: &str) -> Res<PathBuf> {
    let p = Path::new(rel);
    if rel.is_empty() || p.components().any(|c| !matches!(c, Component::Normal(_))) {
        return Err(format!("Caminho inválido: {rel}"));
    }
    Ok(root.join(p))
}

fn relative(root: &Path, p: &Path) -> Option<String> {
    let r = p.strip_prefix(root).ok()?;
    Some(r.components().map(|c| c.as_os_str().to_string_lossy()).collect::<Vec<_>>().join("/"))
}

/// Pastas e arquivos ocultos (.prisma, .git) e node_modules ficam fora da listagem e da observação.
fn hidden(rel: &str) -> bool {
    rel.split('/').any(|s| s.starts_with('.') || s == "node_modules")
}

/// Cria .prisma/config.yaml, .prisma/cache/, .prisma/skills/ e o .gitignore quando faltam.
pub fn ensure_layout(root: &Path) -> std::io::Result<()> {
    let prisma = root.join(".prisma");
    fs::create_dir_all(prisma.join("cache"))?;
    fs::create_dir_all(prisma.join("skills"))?;
    let cfg = prisma.join("config.yaml");
    if !cfg.exists() {
        fs::write(cfg, CONFIG)?;
    }
    let gi = root.join(".gitignore");
    let cur = fs::read_to_string(&gi).unwrap_or_default();
    if !cur.lines().any(|l| l.trim() == IGNORE_LINE) {
        let sep = if cur.is_empty() || cur.ends_with('\n') { "" } else { "\n" };
        fs::write(gi, format!("{cur}{sep}{IGNORE_LINE}\n"))?;
    }
    Ok(())
}

pub fn list(root: &Path) -> Vec<Entry> {
    fn walk(root: &Path, dir: &Path, out: &mut Vec<Entry>) {
        let Ok(rd) = fs::read_dir(dir) else { return };
        for e in rd.flatten() {
            let p = e.path();
            let Some(rel) = relative(root, &p) else { continue };
            if hidden(&rel) {
                continue;
            }
            if p.is_dir() {
                walk(root, &p, out);
            } else {
                out.push(Entry { modified: mtime(&p).unwrap_or(0), path: rel });
            }
        }
    }
    let mut out = Vec::new();
    walk(root, root, &mut out);
    out.sort_by(|a, b| a.path.cmp(&b.path));
    out
}

/// Grava num temporário ao lado e renomeia: uma queda no meio não deixa o arquivo pela metade.
pub fn write_atomic(path: &Path, content: &str) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let tmp = path.with_extension(format!("{}prisma-tmp", path.extension().map(|e| e.to_string_lossy() + ".").unwrap_or_default()));
    fs::write(&tmp, content)?;
    fs::rename(&tmp, path)
}

fn root(state: &State<Vault>) -> Res<PathBuf> {
    state.root.lock().unwrap().clone().ok_or_else(|| "Nenhum cofre aberto".into())
}

#[tauri::command]
pub fn vault_open(app: AppHandle, state: State<Vault>, path: String) -> Res<Vec<Entry>> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("Pasta não encontrada: {path}"));
    }
    ensure_layout(&root).map_err(err)?;

    let watch_root = root.clone();
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        let Ok(ev) = res else { return };
        if !matches!(ev.kind, EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)) {
            return;
        }
        let paths: Vec<String> = ev.paths.iter().filter_map(|p| relative(&watch_root, p)).filter(|r| !hidden(r) && !r.ends_with("prisma-tmp")).collect();
        if !paths.is_empty() {
            let _ = app.emit("vault-changed", paths);
        }
    })
    .map_err(err)?;
    watcher.watch(&root, RecursiveMode::Recursive).map_err(err)?;

    *state.watcher.lock().unwrap() = Some(watcher); // substitui (e encerra) o observador anterior
    *state.root.lock().unwrap() = Some(root.clone());
    Ok(list(&root))
}

#[tauri::command]
pub fn vault_list(state: State<Vault>) -> Res<Vec<Entry>> {
    Ok(list(&root(&state)?))
}

#[tauri::command]
pub fn vault_read(state: State<Vault>, path: String) -> Res<String> {
    fs::read_to_string(resolve(&root(&state)?, &path)?).map_err(err)
}

#[tauri::command]
pub fn vault_write(state: State<Vault>, path: String, content: String) -> Res<()> {
    write_atomic(&resolve(&root(&state)?, &path)?, &content).map_err(err)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tmp(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("prisma-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn resolve_recusa_sair_do_cofre() {
        let r = Path::new("C:/cofre");
        assert!(resolve(r, "a/b.caderno.md").is_ok());
        for bad in ["", "../x", "a/../../x", "/etc/passwd", "./a"] {
            assert!(resolve(r, bad).is_err(), "{bad}");
        }
        #[cfg(windows)]
        assert!(resolve(r, "C:/x").is_err());
    }

    #[test]
    fn layout_e_gravacao() {
        let d = tmp("layout");
        fs::write(d.join(".gitignore"), "target/").unwrap();
        ensure_layout(&d).unwrap();
        ensure_layout(&d).unwrap(); // idempotente
        assert_eq!(fs::read_to_string(d.join(".gitignore")).unwrap(), "target/\n.prisma/cache/\n");
        assert!(d.join(".prisma/config.yaml").exists());

        let text = "---\ntipo: caderno\n---\r\nΔV := 1 V\n";
        write_atomic(&d.join("sub/x.caderno.md"), text).unwrap();
        assert_eq!(fs::read(d.join("sub/x.caderno.md")).unwrap(), text.as_bytes());
        let files: Vec<String> = list(&d).into_iter().map(|e| e.path).collect();
        assert_eq!(files, vec!["sub/x.caderno.md"]); // .gitignore e .prisma ficam de fora
        fs::remove_dir_all(d).unwrap();
    }
}
