// main.rs
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
  format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn generate_docs(path: String) -> Result<String, String> {
  println!("Generating docs in path: {}", path);
  let output2 = std::process::Command::new("npx")
    .args([
      "typedoc",
      "--entryPointStrategy",
      "Expand",
      "src",
      "--out",
      "./docs",
    ])
    .current_dir(&path)
    .output()
    .map_err(|e| e.to_string())?;

  if !output2.status.success() {
    let error = String::from_utf8_lossy(&output2.stderr);
    return Err(error.into_owned());
  }

  println!("Docs generated successfully");
  Ok(format!("{}/docs", path))
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![greet, generate_docs]) // Combined into single handler
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_opener::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
