use moka::sync::Cache;
use once_cell::sync::Lazy;
use serde::Serialize;
use std::path::Path;
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

// Improved cache implementation using Moka
const CACHE_TTL: Duration = Duration::from_secs(300);
static COMMIT_CACHE: Lazy<Cache<String, Arc<[BasicCommit]>>> =
  Lazy::new(|| Cache::builder().time_to_live(CACHE_TTL).build());

pub fn find_git_root(start_path: &Path) -> Option<String> {
  Command::new("git")
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
    .map(|s| s.trim().to_string())
}

fn parse_git_log_output(output: &str) -> Vec<BasicCommit> {
  let mut commits = Vec::new();
  // Split commits using the null byte separator
  for commit_block in output.split("\0<COMMIT>") {
    let mut fields = commit_block.split('\0');
    let id = fields.next().unwrap_or_default().trim().to_string();
    let author = fields.next().unwrap_or_default().trim().to_string();
    let date_str = fields.next().unwrap_or_default().trim();
    let message = fields.next().unwrap_or_default().trim().to_string();

    if id.is_empty() {
      continue;
    }

    commits.push(BasicCommit {
      id,
      author,
      date: date_str.parse().unwrap_or(0),
      message,
    });
  }
  commits
}

pub async fn list_folder_commits(
  path: String,
  page: Option<usize>,
  per_page: Option<usize>,
  branch: Option<String>,
  remote: Option<String>,
) -> Result<Vec<BasicCommit>, String> {
  let page = page.unwrap_or(1);
  let per_page = per_page.unwrap_or(20).max(1);
  let cache_key = format!(
      "{}|{}|{}",
      path,
      branch.as_deref().unwrap_or(""),
      remote.as_deref().unwrap_or("")
  );

  // Get commits (either from cache or git)
  let all_commits_arc = if let Some(cached) = COMMIT_CACHE.get(&cache_key) {
      cached
  } else {
      // Git command setup remains the same
      let git_root = find_git_root(Path::new(&path)).ok_or("Could not find Git repository")?;
      let relative_path = Path::new(&path)
          .strip_prefix(&git_root)
          .map_err(|_| "Failed to get relative path")?
          .to_str()
          .ok_or("Invalid path")?;

      let mut cmd = Command::new("git");
      cmd
          .arg("-C")
          .arg(&git_root)
          .arg("log")
          .arg("--format=%H%x00%an%x00%at%x00%B%x00<COMMIT>")
          .arg("--")
          .arg(relative_path);

      if let Some(branch_name) = branch {
          let ref_name = remote
              .map(|r| format!("{}/{}", r, branch_name))
              .unwrap_or(branch_name);
          cmd.arg(ref_name);
      }

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

  // Improved pagination logic
  let total_commits = all_commits_arc.len();
  if total_commits == 0 {
      return Ok(Vec::new());
  }

  let start = (page - 1) * per_page;
  if start >= total_commits {
      return Ok(Vec::new());
  }

  let end = (start + per_page).min(total_commits);
  Ok(all_commits_arc[start..end].to_vec())
}

pub fn get_git_references(path: &str) -> Result<GitReferences, String> {
  // Get remotes
  let remotes_output = Command::new("git")
    .arg("-C")
    .arg(path)
    .arg("remote")
    .output()
    .map_err(|e| format!("Failed to get remotes: {}", e))?;

  let remotes = String::from_utf8_lossy(&remotes_output.stdout)
    .lines()
    .map(|s| s.to_string())
    .collect();

  // Get branches
  // let branches_output = Command::new("git")
  //   .arg("-C")
  //   .arg(path)
  //   .arg("branch")
  //   .arg("-a")
  //   .output()
  //   .map_err(|e| format!("Failed to get branches: {}", e))?;

  // let branches = String::from_utf8_lossy(&branches_output.stdout)
  //   .lines()
  //   .map(|s| s.trim().trim_start_matches("* ").to_string())
  //   .collect();
  let branches = vec!["master".to_string()];

  Ok(GitReferences { remotes, branches })
}

#[derive(Serialize)]
pub struct GitReferences {
  pub remotes: Vec<String>,
  pub branches: Vec<String>,
}
