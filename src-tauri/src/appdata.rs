//! Pastas do sistema (ADENDO 01, A3), configuração, recuperação e arquivos passados na linha de comando.
//! %APPDATA%\Prisma e %LOCALAPPDATA%\Prisma: usamos config_dir/local_data_dir + "Prisma", porque
//! appConfigDir() do Tauri usaria o identificador (app.prisma) como nome da pasta.
use crate::files::{err, mtime, write_atomic, Res};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const APP: &str = "Prisma";
const CONFIG: &str = "# Configuração do Prisma
unidades: SI
casas_decimais: 2
separador_decimal: \",\"
motor_latex: tectonic
tema: grafite-violeta
verificacao:
  margem_atencao: 20 %
";

/// Só em build de depuração: PRISMA_HOME troca as pastas do sistema por uma pasta de teste,
/// para o `npm run test:app` nunca mexer nos Documentos e na configuração de quem roda os testes.
fn test_home() -> Option<PathBuf> {
    if cfg!(debug_assertions) { std::env::var_os("PRISMA_HOME").map(PathBuf::from) } else { None }
}
pub fn config_dir(app: &AppHandle) -> Res<PathBuf> {
    if let Some(h) = test_home() { return Ok(h.join("AppData/Roaming").join(APP)); }
    Ok(app.path().config_dir().map_err(err)?.join(APP))
}
fn local_dir(app: &AppHandle) -> Res<PathBuf> {
    if let Some(h) = test_home() { return Ok(h.join("AppData/Local").join(APP)); }
    Ok(app.path().local_data_dir().map_err(err)?.join(APP))
}
fn docs_dir(app: &AppHandle) -> Res<PathBuf> {
    if let Some(h) = test_home() { return Ok(h.join("Documentos").join(APP)); }
    Ok(app.path().document_dir().map_err(err)?.join(APP))
}
fn recovery_dir(app: &AppHandle) -> Res<PathBuf> {
    Ok(local_dir(app)?.join("recuperacao"))
}
fn slash(p: &Path) -> String {
    p.to_string_lossy().replace('\\', "/")
}

/// Primeira execução: cria Documentos\Prisma\{Bibliotecas,Modelos,Skills} e o config.yaml. Nunca apaga nada.
pub fn first_run(app: &AppHandle) -> Res<()> {
    let docs = docs_dir(app)?;
    for sub in ["Bibliotecas", "Modelos", "Skills"] {
        fs::create_dir_all(docs.join(sub)).map_err(err)?;
    }
    let cfg = config_dir(app)?;
    fs::create_dir_all(&cfg).map_err(err)?;
    if !cfg.join("config.yaml").exists() {
        fs::write(cfg.join("config.yaml"), CONFIG).map_err(err)?;
    }
    fs::create_dir_all(recovery_dir(app)?).map_err(err)?;
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPaths {
    docs: String,
    libraries: String,
    models: String,
    skills: String,
    factory: String, // recursos do programa: bibliotecas e modelos de fábrica, somente leitura
}

#[tauri::command]
pub fn app_paths(app: AppHandle) -> Res<AppPaths> {
    let d = docs_dir(&app)?;
    let factory = app.path().resource_dir().map(|r| slash(&r)).unwrap_or_default();
    Ok(AppPaths { docs: slash(&d), libraries: slash(&d.join("Bibliotecas")), models: slash(&d.join("Modelos")), skills: slash(&d.join("Skills")), factory })
}

#[tauri::command]
pub fn config_read(app: AppHandle) -> Res<String> {
    fs::read_to_string(config_dir(&app)?.join("config.yaml")).map_err(err)
}

fn with_ext(dir: &Path, ext: &str) -> Vec<String> {
    let mut v: Vec<String> = fs::read_dir(dir)
        .map(|rd| rd.flatten().map(|e| e.path()).filter(|p| p.extension().is_some_and(|e| e.eq_ignore_ascii_case(ext))).map(|p| slash(&p)).collect())
        .unwrap_or_default();
    v.sort();
    v
}

#[derive(Serialize)]
pub struct LibraryFiles {
    user: Vec<String>,
    factory: Vec<String>,
}

/// Bibliotecas do usuário (Documentos\Prisma\Bibliotecas) e de fábrica (recursos do programa). As do projeto vêm do .prsp.
#[tauri::command]
pub fn library_files(app: AppHandle) -> Res<LibraryFiles> {
    let factory = app.path().resource_dir().map(|r| with_ext(&r.join("bibliotecas"), "prsl")).unwrap_or_default();
    Ok(LibraryFiles { user: with_ext(&docs_dir(&app)?.join("Bibliotecas"), "prsl"), factory })
}

#[derive(Serialize)]
pub struct Recovered {
    name: String,
    modified: u64,
}

/// Nome de arquivo de recuperação: só o nome, sem pastas.
fn recovery_file(app: &AppHandle, name: &str) -> Res<PathBuf> {
    if name.is_empty() || name.contains(['/', '\\']) || name.contains("..") {
        return Err(format!("Nome inválido: {name}"));
    }
    Ok(recovery_dir(app)?.join(name))
}

#[tauri::command]
pub fn recovery_list(app: AppHandle) -> Res<Vec<Recovered>> {
    let dir = recovery_dir(&app)?;
    let Ok(rd) = fs::read_dir(&dir) else { return Ok(vec![]) };
    Ok(rd.flatten().filter(|e| e.path().is_file()).map(|e| Recovered { name: e.file_name().to_string_lossy().into(), modified: mtime(&e.path()).unwrap_or(0) }).collect())
}

#[tauri::command]
pub fn recovery_read(app: AppHandle, name: String) -> Res<String> {
    fs::read_to_string(recovery_file(&app, &name)?).map_err(err)
}

#[tauri::command]
pub fn recovery_write(app: AppHandle, name: String, content: String) -> Res<()> {
    write_atomic(&recovery_file(&app, &name)?, &content).map_err(err)
}

#[tauri::command]
pub fn recovery_delete(app: AppHandle, name: String) -> Res<()> {
    let p = recovery_file(&app, &name)?;
    if p.exists() { fs::remove_file(p).map_err(err) } else { Ok(()) }
}

/// Arquivos existentes entre os argumentos (duplo clique no Explorador, `prisma.exe a.prsm b.prsf`).
pub fn files_in_args(args: &[String]) -> Vec<String> {
    args.iter().skip(1).filter(|a| !a.starts_with('-') && Path::new(a).is_file()).map(|a| slash(Path::new(a))).collect()
}

#[tauri::command]
pub fn startup_files() -> Vec<String> {
    files_in_args(&std::env::args().collect::<Vec<_>>())
}

#[cfg(test)]
mod tests {
    use super::*;

    // A9-02 a frio: só arquivos que existem viram abas; opções (--x) e o próprio executável ficam de fora
    #[test]
    fn arquivos_na_linha_de_comando() {
        let dir = std::env::temp_dir().join("prisma-args-test");
        fs::create_dir_all(&dir).unwrap();
        let f = dir.join("a.prsm");
        fs::write(&f, "x").unwrap();
        let args: Vec<String> = vec!["prisma.exe".into(), "--remote-debugging-port=9222".into(), f.to_string_lossy().into(), dir.join("sumiu.prsm").to_string_lossy().into()];
        assert_eq!(files_in_args(&args), vec![slash(&f)]);
        fs::remove_dir_all(&dir).unwrap();
    }
}
