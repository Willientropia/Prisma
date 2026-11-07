mod appdata;
mod files;
mod project;
mod recent;

use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // precisa vir primeiro: o segundo duplo clique abre aba na janela que já está aberta
    .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
      let files = appdata::files_in_args(&argv);
      if !files.is_empty() {
        let _ = app.emit("open-files", files);
      }
      if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.set_focus();
      }
    }))
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .manage(files::Watch::default())
    .invoke_handler(tauri::generate_handler![
      files::file_read,
      files::file_write,
      files::file_stat,
      files::file_rename,
      files::dir_list,
      files::watch_set,
      project::project_create,
      appdata::app_paths,
      appdata::config_read,
      appdata::library_files,
      appdata::recovery_list,
      appdata::recovery_read,
      appdata::recovery_write,
      appdata::recovery_delete,
      appdata::startup_files,
      recent::recent_list,
      recent::recent_add,
      recent::recent_remove,
    ])
    .setup(|app| {
      if let Err(e) = appdata::first_run(app.handle()) {
        eprintln!("Prisma: não foi possível criar as pastas do usuário: {e}");
      }
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
