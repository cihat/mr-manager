use moka::sync::Cache;
use once_cell::sync::Lazy;
use serde::Serialize;
use std::borrow::Cow;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use std::time::Duration;

#[derive(Serialize, Clone, Debug)]
pub struct BasicCommit {
  pub id: String,
  pub message: String,
  pub author: String,
  pub date: i64,
}

const CACHE_TTL: Duration = Duration::from_secs(600);
static COMMIT_CACHE: Lazy<Cache<String, Arc<[BasicCommit]>>> = Lazy::new(|| {
  Cache::builder()
    .time_to_live(CACHE_TTL)
    .initial_capacity(100)
    .build()
});

// Add a new cache for tracking last fetch times per remote
static LAST_FETCH_CACHE: Lazy<Cache<String, i64>> = Lazy::new(|| {
  Cache::builder()
    .time_to_live(Duration::from_secs(3600))
    .initial_capacity(10)
    .build()
});

// Function to perform git fetch for a specific remote
fn fetch_from_remote(git_root: &str, remote: &str) -> Result<(), String> {
  let cache_key = format!("{}:{}", git_root, remote);
  let now = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap()
    .as_secs() as i64;

  // Only fetch if it's been more than 5 minutes since last fetch for this remote
  if let Some(last_fetch) = LAST_FETCH_CACHE.get(&cache_key) {
    if now - last_fetch < 300 {
      // 5 minutes in seconds
      return Ok(());
    }
  }

  let mut cmd = Command::new("git");
  cmd.arg("-C").arg(git_root).arg("fetch").arg(remote);

  let output = cmd
    .output()
    .map_err(|e| format!("Failed to fetch from remote {}: {}", remote, e))?;

  if !output.status.success() {
    return Err(String::from_utf8_lossy(&output.stderr).to_string());
  }

  LAST_FETCH_CACHE.insert(cache_key, now);
  Ok(())
}

pub fn list_folder_commits(
  path: String,
  page: Option<usize>,
  per_page: Option<usize>,
  branch: Option<String>,
  remote: Option<String>,
) -> Result<Vec<BasicCommit>, String> {
  let git_root = find_git_root(Path::new(&path)).ok_or("Could not find Git repository")?;

  // Only fetch if remote is specified and it's not "origin"
  if let Some(ref remote_name) = remote {
    if remote_name != "origin" {
      fetch_from_remote(&git_root, remote_name)?;
    }
  }

  let page = page.unwrap_or(1);
  let per_page = per_page.unwrap_or(20).max(1);

  let cache_key = {
    let mut key = path.clone();
    if let Some(ref b) = branch {
      key.push('|');
      key.push_str(b);
    }
    if let Some(ref r) = remote {
      key.push('|');
      key.push_str(r);
    }
    key
  };

  let all_commits_arc = if let Some(cached) = COMMIT_CACHE.get(&cache_key) {
    cached
  } else {
    let relative_path = Path::new(&path)
      .strip_prefix(&git_root)
      .map_err(|_| "Failed to get relative path")?
      .to_str()
      .ok_or("Invalid path")?;

    let mut cmd = Command::new("git");
    let cmd = cmd
      .arg("-C")
      .arg(&git_root)
      .arg("log")
      .arg("--format=%H%x00%an%x00%at%x00%B%x00<COMMIT>")
      .arg("--");

    if let Some(branch_name) = branch {
      let ref_name = remote.map_or(Cow::Borrowed(&branch_name), |r| {
        Cow::Owned(format!("{}/{}", r, branch_name))
      });
      cmd.arg(&*ref_name);
    }

    cmd.arg(relative_path);

    let output = cmd
      .output()
      .map_err(|e| format!("Failed to execute git command: {}", e))?;

    if !output.status.success() {
      return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let output_str = String::from_utf8(output.stdout).map_err(|e| e.to_string())?;
    let all_commits = parse_git_log_output(&output_str);
    let commits_arc: Arc<[BasicCommit]> = Arc::from(all_commits.into_boxed_slice());
    COMMIT_CACHE.insert(cache_key, commits_arc.clone());
    commits_arc
  };

  let start = (page.saturating_sub(1)) * per_page;
  if start >= all_commits_arc.len() {
    return Ok(Vec::new());
  }

  let end = (start + per_page).min(all_commits_arc.len());
  Ok(all_commits_arc[start..end].to_vec())
}

// Update the clear_git_cache function to also clear the fetch cache
#[tauri::command]
pub fn clear_git_cache(path: Option<String>) -> Result<(), String> {
  match path {
    Some(specific_path) => {
      GIT_ROOT_CACHE.remove(&PathBuf::from(specific_path.clone()));
      COMMIT_CACHE.remove(&specific_path);
      // Clear fetch cache for the specific path
      if let Some(git_root) = find_git_root(PathBuf::from(&specific_path).as_path()) {
        let remotes = get_git_references(&git_root)?.remotes;
        for remote in remotes {
          LAST_FETCH_CACHE.remove(&format!("{}:{}", git_root, remote));
        }
      }
      Ok(())
    }
    None => {
      GIT_ROOT_CACHE.invalidate_all();
      COMMIT_CACHE.invalidate_all();
      LAST_FETCH_CACHE.invalidate_all();
      Ok(())
    }
  }
}

static GIT_ROOT_CACHE: Lazy<Cache<PathBuf, String>> = Lazy::new(|| {
  Cache::builder()
    .time_to_live(Duration::from_secs(3600))
    .initial_capacity(10)
    .build()
});

pub fn find_git_root(start_path: &Path) -> Option<String> {
  if let Some(cached_root) = GIT_ROOT_CACHE.get(start_path) {
    return Some(cached_root);
  }

  let result = Command::new("git")
    .args(["-C", start_path.to_str()?, "rev-parse", "--show-toplevel"])
    .output()
    .ok()
    .and_then(|output| {
      if output.status.success() {
        String::from_utf8(output.stdout).ok()
      } else {
        None
      }
    })
    .map(|s| s.trim().to_string());

  if let Some(ref root) = result {
    GIT_ROOT_CACHE.insert(start_path.to_path_buf(), root.clone());
  }

  result
}

fn parse_git_log_output(output: &str) -> Vec<BasicCommit> {
  let mut commits = Vec::with_capacity(32);
  for commit_block in output.split("\0<COMMIT>") {
    let mut fields = commit_block.splitn(4, '\0');
    let id = match fields.next() {
      Some(s) if !s.is_empty() => s.trim(),
      _ => continue,
    };

    let author = fields.next().map(str::trim).unwrap_or_default();
    let date_str = fields.next().unwrap_or_default().trim();
    let message = fields.next().map(str::trim).unwrap_or_default();

    if let Ok(date) = date_str.parse() {
      commits.push(BasicCommit {
        id: id.to_string(),
        author: author.to_string(),
        date,
        message: message.to_string(),
      });
    }
  }
  commits
}

pub fn get_git_references(path: &str) -> Result<GitReferences, String> {
  let remotes = Command::new("git")
    .arg("-C")
    .arg(path)
    .arg("remote")
    .output()
    .map_err(|e| format!("Failed to get remotes: {}", e))
    .and_then(|output| {
      String::from_utf8(output.stdout)
        .map(|s| s.lines().map(String::from).collect())
        .map_err(|e| e.to_string())
    })?;

  let branches = vec![String::from("master")];

  Ok(GitReferences { remotes, branches })
}

#[derive(Serialize)]
pub struct GitReferences {
  pub remotes: Vec<String>,
  pub branches: Vec<String>,
}

#[tauri::command]
pub fn check_new_commits(
  path: String,
  branch: Option<String>,
  remote: Option<String>,
  last_commit_id: Option<String>,
) -> Result<Option<BasicCommit>, String> {
  let git_root = find_git_root(Path::new(&path)).ok_or("Could not find Git repository")?;

  let mut cmd = Command::new("git");
  cmd
    .arg("-C")
    .arg(&git_root)
    .arg("fetch")
    .arg(remote.as_deref().unwrap_or("upstream"));

  if let Err(e) = cmd.output() {
    return Err(format!("Failed to fetch from remote: {}", e));
  }

  let mut log_cmd = Command::new("git");
  let log_cmd = log_cmd
    .arg("-C")
    .arg(&git_root)
    .arg("log")
    .arg("-1") // Get only the latest commit
    .arg("--format=%H%x00%an%x00%at%x00%B%x00<COMMIT>");

  if let Some(branch_name) = branch {
    let ref_name = remote.map_or(Cow::Borrowed(&branch_name), |r| {
      Cow::Owned(format!("{}/{}", r, branch_name))
    });
    log_cmd.arg(&*ref_name);
  }

  let output = log_cmd
    .output()
    .map_err(|e| format!("Failed to execute git command: {}", e))?;

  if !output.status.success() {
    return Err(String::from_utf8_lossy(&output.stderr).to_string());
  }

  let output_str = String::from_utf8(output.stdout).map_err(|e| e.to_string())?;
  let commits = parse_git_log_output(&output_str);

  if let Some(latest_commit) = commits.first() {
    // If we have a last_commit_id and it's different from the latest commit,
    // return the new commit
    if let Some(last_id) = last_commit_id {
      if latest_commit.id != last_id {
        return Ok(Some(latest_commit.clone()));
      }
    }
  }

  Ok(None)
}
