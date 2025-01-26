#[tauri::command]
async fn generate_docs(path: String) -> Result<String, String> {
  let project_name = std::path::Path::new(&path)
    .file_name()
    .ok_or_else(|| "Invalid path".to_string())?
    .to_str()
    .ok_or_else(|| "Invalid project name".to_string())?;

  let file_type = if std::path::Path::new(&path).join("tsconfig.json").exists() {
    "ts"
  } else {
    "js"
  };

  let home_dir = dirs::home_dir().ok_or_else(|| "Could not find home directory".to_string())?;
  let docs_path = home_dir
    .join("mr-manager")
    .join(project_name)
    .to_str()
    .ok_or_else(|| "Invalid path".to_string())?
    .to_string();

  std::fs::create_dir_all(&docs_path)
    .map_err(|e| format!("Failed to create docs directory: {}", e))?;

  let doc_command = match file_type {
    "ts" => vec![
      "typedoc",
      "--entryPointStrategy",
      "Expand",
      "src",
      "--out",
      &docs_path,
    ],
    "js" => vec!["jsdoc", "-r", "src", "-d", &docs_path],
    _ => return Err(format!("Unsupported file type: {}", file_type)),
  };

  let output = std::process::Command::new("npx")
    .args(&doc_command)
    .current_dir(&path)
    .output()
    .map_err(|e| e.to_string())?;

  if !output.status.success() {
    let error = String::from_utf8_lossy(&output.stderr);
    return Err(error.into_owned());
  }

  Ok(docs_path)
}
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
  match std::fs::read_to_string(&path) {
    Ok(contents) => Ok(contents),
    Err(e) => Err(e.to_string()),
  }
}

#[tauri::command]
fn file_exists(path: String) -> bool {
  std::path::Path::new(&path).exists()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      generate_docs,
      read_file,
      file_exists
    ]) // Combined into single handler
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_opener::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
