//! Projeto `.prsp` (ADENDO 01, A2): uma pasta com o arquivo de projeto e as subpastas sugeridas.
use crate::files::{err, write_atomic, Res};
use std::fs;
use std::path::{Path, PathBuf};

const IGNORE_LINE: &str = ".prisma-cache/";
const FOLDERS: &[&str] = &["calculos", "memorial", "bibliotecas"];

/// "Usina Boa Vista" -> "usina-boa-vista".
pub fn slug(name: &str) -> String {
    let map = |c: char| match c {
        'á' | 'à' | 'â' | 'ã' | 'ä' => 'a',
        'é' | 'è' | 'ê' | 'ë' => 'e',
        'í' | 'ì' | 'î' | 'ï' => 'i',
        'ó' | 'ò' | 'ô' | 'õ' | 'ö' => 'o',
        'ú' | 'ù' | 'û' | 'ü' => 'u',
        'ç' => 'c',
        c if c.is_ascii_alphanumeric() => c,
        _ => '-',
    };
    let s: String = name.to_lowercase().chars().map(map).collect();
    let s = s.split('-').filter(|p| !p.is_empty()).collect::<Vec<_>>().join("-");
    if s.is_empty() { "projeto".into() } else { s }
}

/// Acrescenta `.prisma-cache/` ao .gitignore da pasta, criando o arquivo se faltar.
pub fn ensure_gitignore(dir: &Path) -> std::io::Result<()> {
    let gi = dir.join(".gitignore");
    let cur = fs::read_to_string(&gi).unwrap_or_default();
    if cur.lines().any(|l| l.trim() == IGNORE_LINE) {
        return Ok(());
    }
    let sep = if cur.is_empty() || cur.ends_with('\n') { "" } else { "\n" };
    fs::write(gi, format!("{cur}{sep}{IGNORE_LINE}\n"))
}

/// Cria o projeto a partir do caminho escolhido em "Salvar como" (ex.: `C:/X/Usina Boa Vista.prsp`):
/// pasta `C:/X/Usina Boa Vista/` com `usina-boa-vista.prsp`, `calculos/`, `memorial/`, `bibliotecas/` e `.gitignore`.
pub fn create(chosen: &Path) -> std::io::Result<PathBuf> {
    let name = chosen.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| "Projeto".into());
    let dir = chosen.with_file_name(&name);
    let file = dir.join(format!("{}.prsp", slug(&name)));
    if file.exists() {
        return Err(std::io::Error::new(std::io::ErrorKind::AlreadyExists, format!("Já existe um projeto em {}", file.display())));
    }
    for f in FOLDERS {
        fs::create_dir_all(dir.join(f))?;
    }
    ensure_gitignore(&dir)?;
    let nome = serde_json::to_string(&name).unwrap_or_else(|_| format!("\"{name}\"")); // string JSON é YAML válido
    let text = format!("---\ntipo: projeto\nnome: {nome}\narquivos: []\ndocumentos: []\nbibliotecas: []\nversao_formato: 1\n---\n");
    write_atomic(&file, &text)?;
    Ok(file)
}

#[tauri::command]
pub fn project_create(path: String) -> Res<String> {
    let p = PathBuf::from(&path);
    if !p.is_absolute() {
        return Err(format!("Caminho precisa ser absoluto: {path}"));
    }
    create(&p).map(|f| f.to_string_lossy().replace('\\', "/")).map_err(err)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::files::tests::tmp;

    #[test]
    fn nome_de_arquivo() {
        assert_eq!(slug("Usina Boa Vista"), "usina-boa-vista");
        assert_eq!(slug("Ação  Elétrica!"), "acao-eletrica");
        assert_eq!(slug("???"), "projeto");
    }

    #[test]
    fn cria_pastas_gitignore_e_prsp() {
        let d = tmp("project");
        fs::write(d.join("x.txt"), "").unwrap();
        let f = create(&d.join("Usina Boa Vista.prsp")).unwrap();
        let root = d.join("Usina Boa Vista");
        assert_eq!(f, root.join("usina-boa-vista.prsp"));
        for sub in FOLDERS {
            assert!(root.join(sub).is_dir());
        }
        assert_eq!(fs::read_to_string(root.join(".gitignore")).unwrap(), ".prisma-cache/\n");
        let text = fs::read_to_string(&f).unwrap();
        assert!(text.starts_with("---\ntipo: projeto\nnome: \"Usina Boa Vista\"\n"));
        assert!(create(&d.join("Usina Boa Vista.prsp")).is_err(), "não sobrescreve");

        fs::write(root.join(".gitignore"), "target/").unwrap();
        ensure_gitignore(&root).unwrap();
        ensure_gitignore(&root).unwrap();
        assert_eq!(fs::read_to_string(root.join(".gitignore")).unwrap(), "target/\n.prisma-cache/\n");
        fs::remove_dir_all(d).unwrap();
    }
}
