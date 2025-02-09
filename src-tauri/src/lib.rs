mod git;
use git::GitReferences;
use git2::{DiffOptions, Oid, Repository};
use serde::Serialize;
use std::{
  path::{Path, PathBuf},
  process::Command,
};

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

#[tauri::command]
fn list_folders(path: String) -> Result<Vec<String>, String> {
  let path = Path::new(&path);
  if !path.exists() {
    return Err("Path does not exist".to_string());
  }

  let entries = std::fs::read_dir(path)
    .map_err(|e| e.to_string())?
    .filter_map(|entry| {
      let entry = entry.ok()?;
      let path = entry.path();
      if path.is_dir() {
        path.file_name()?.to_str().map(String::from)
      } else {
        None
      }
    })
    .collect();

  Ok(entries)
}

#[derive(Serialize)]
struct DetailedCommit {
  id: String,
  message: String,
  author: String,
  date: i64,
  changes: Vec<GitChange>,
}

#[derive(Serialize)]
struct GitChange {
  status: String,
  file: String,
}

fn find_git_root(start_path: &Path) -> Option<PathBuf> {
  let mut current_path = start_path.to_path_buf();
  loop {
    let git_dir = current_path.join(".git");
    if git_dir.exists() {
      return Some(current_path);
    }
    if !current_path.pop() {
      return None;
    }
  }
}

#[tauri::command]
async fn list_folder_commits(
  path: String,
  page: Option<usize>,
  per_page: Option<usize>,
  branch: Option<String>,
  remote: Option<String>,
) -> Result<Vec<git::BasicCommit>, String> {
  git::list_folder_commits(path, page, per_page, branch, remote)
}

#[tauri::command]
fn get_git_references(path: &str) -> Result<GitReferences, String> {
  git::get_git_references(path)
}

#[tauri::command]
async fn get_commit_diff(
  repo_path: String,
  commit_id: String,
  file_path: String,
) -> Result<(String, String), String> {
  let path = Path::new(&repo_path);
  let git_root = find_git_root(path).ok_or_else(|| "Could not find Git repository".to_string())?;
  let repo =
    Repository::open(&git_root).map_err(|e| format!("Failed to open repository: {}", e))?;

  let oid = Oid::from_str(&commit_id).map_err(|e| format!("Invalid commit ID: {}", e))?;
  let commit = repo
    .find_commit(oid)
    .map_err(|e| format!("Failed to find commit: {}", e))?;

  // Get the commit tree
  let tree = commit.tree().map_err(|e| e.to_string())?;

  // Get parent commit's tree or empty for first commit
  let parent_tree = commit
    .parent(0)
    .and_then(|parent| parent.tree())
    .unwrap_or(tree.clone());

  // Find the file in both trees
  let old_blob = parent_tree
    .get_path(Path::new(&file_path))
    .ok()
    .and_then(|entry| entry.to_object(&repo).ok())
    .and_then(|obj| {
      obj
        .as_blob()
        .map(|blob| String::from_utf8_lossy(blob.content()).into_owned())
    });

  let new_blob = tree
    .get_path(Path::new(&file_path))
    .ok()
    .and_then(|entry| entry.to_object(&repo).ok())
    .and_then(|obj| {
      obj
        .as_blob()
        .map(|blob| String::from_utf8_lossy(blob.content()).into_owned())
    });

  match (old_blob, new_blob) {
    (Some(old_content), Some(new_content)) => Ok((old_content, new_content)),
    (None, Some(new_content)) => Ok(("".to_string(), new_content)),
    (Some(old_content), None) => Ok((old_content, "".to_string())),
    (None, None) => Err("File not found in commit".to_string()),
  }
}

#[tauri::command]
fn get_commit_details(repo_path: String, commit_id: String) -> Result<DetailedCommit, String> {
  let path = Path::new(&repo_path);
  let git_root = find_git_root(path).ok_or_else(|| "Could not find Git repository".to_string())?;

  let repo =
    Repository::open(&git_root).map_err(|e| format!("Failed to open repository: {}", e))?;

  let relative_path = path
    .strip_prefix(&git_root)
    .map_err(|_| "Failed to get relative path".to_string())?
    .to_str()
    .ok_or_else(|| "Invalid path".to_string())?
    .to_string();

  let oid = Oid::from_str(&commit_id).map_err(|e| format!("Invalid commit ID: {}", e))?;

  let commit = repo
    .find_commit(oid)
    .map_err(|e| format!("Failed to find commit: {}", e))?;

  let tree = commit.tree().map_err(|e| e.to_string())?;

  // Get parent tree or use empty tree for first commit
  let parent_tree = if let Ok(parent) = commit.parent(0) {
    parent.tree().map_err(|e| e.to_string())?
  } else {
    tree.clone()
  };

  let mut diff_opts = DiffOptions::new();
  let diff = repo
    .diff_tree_to_tree(Some(&parent_tree), Some(&tree), Some(&mut diff_opts))
    .map_err(|e| e.to_string())?;

  let mut changes = Vec::new();

  diff
    .foreach(
      &mut |delta, _| {
        if let Some(file_path) = delta.new_file().path() {
          if let Some(file_path_str) = file_path.to_str() {
            if file_path_str.starts_with(&relative_path) {
              let change = GitChange {
                status: match delta.status() {
                  git2::Delta::Added => "Added".to_string(),
                  git2::Delta::Deleted => "Deleted".to_string(),
                  git2::Delta::Modified => "Modified".to_string(),
                  git2::Delta::Renamed => "Renamed".to_string(),
                  git2::Delta::Copied => "Copied".to_string(),
                  git2::Delta::Ignored => "Ignored".to_string(),
                  git2::Delta::Untracked => "Untracked".to_string(),
                  git2::Delta::Typechange => "Type Changed".to_string(),
                  git2::Delta::Unmodified => "Unmodified".to_string(),
                  git2::Delta::Unreadable => "Unreadable".to_string(),
                  git2::Delta::Conflicted => "Conflicted".to_string(),
                },
                file: file_path_str.to_string(),
              };
              changes.push(change);
            }
          }
        }
        true
      },
      None,
      None,
      None,
    )
    .map_err(|e| e.to_string())?;

  // Create the detailed commit outside the borrow scope
  let detailed_commit = DetailedCommit {
    id: commit.id().to_string(),
    message: commit.message().unwrap_or("").to_string(),
    author: commit.author().name().unwrap_or("").to_string(),
    date: commit.time().seconds(),
    changes,
  };

  Ok(detailed_commit)
}

#[tauri::command]
fn get_new_commits_details(repo_path: String, commit_id: String) -> Result<DetailedCommit, String> {
  let path = Path::new(&repo_path);
  let git_root = find_git_root(path).ok_or_else(|| "Could not find Git repository".to_string())?;

  // Fetch commit object using git command since it may not exist locally
  let output = Command::new("git")
    .arg("-C")
    .arg(&git_root)
    .args([
      "show",
      "--format=%H%n%an%n%at%n%B",
      "--name-status",
      commit_id.as_str(),
    ])
    .output()
    .map_err(|e| format!("Failed to get commit: {}", e))?;

  if !output.status.success() {
    return Err(String::from_utf8_lossy(&output.stderr).to_string());
  }

  let output_str = String::from_utf8(output.stdout).map_err(|e| e.to_string())?;
  let mut lines = output_str.lines();

  // Parse commit details
  let id = lines.next().ok_or("Missing commit hash")?.to_string();
  let author = lines.next().ok_or("Missing author")?.to_string();
  let date = lines
    .next()
    .ok_or("Missing date")?
    .parse::<i64>()
    .map_err(|e| format!("Invalid date: {}", e))?;

  // Get commit message until blank line
  let mut message = String::new();
  while let Some(line) = lines.next() {
    if line.is_empty() {
      break;
    }
    message.push_str(line);
    message.push('\n');
  }

  // Parse file changes
  let mut changes = Vec::new();
  while let Some(line) = lines.next() {
    if line.is_empty() {
      continue;
    }

    let mut parts = line.split_whitespace();
    let status = match parts.next() {
      Some("A") => "Added",
      Some("M") => "Modified",
      Some("D") => "Deleted",
      Some("R") => "Renamed",
      Some("C") => "Copied",
      Some("T") => "Type Changed",
      Some("U") => "Unmerged",
      _ => continue,
    };

    if let Some(file) = parts.next() {
      changes.push(GitChange {
        status: status.to_string(),
        file: file.to_string(),
      });
    }
  }

  Ok(DetailedCommit {
    id,
    message,
    author,
    date,
    changes,
  })
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .invoke_handler(tauri::generate_handler![
      generate_docs,
      read_file,
      file_exists,
      list_folders,
      list_folder_commits,
      get_commit_details,
      get_commit_diff,
      get_git_references,
      get_new_commits_details,
      git::get_new_commits,
      git::clear_git_cache
    ]) // Combined into single handler
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_opener::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
