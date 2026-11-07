mod recent;
mod vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .manage(vault::Vault::default())
    .invoke_handler(tauri::generate_handler![
      vault::vault_open,
      vault::vault_list,
      vault::vault_read,
      vault::vault_write,
      recent::recent_list,
      recent::recent_add,
    ])
    .setup(|app| {
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
