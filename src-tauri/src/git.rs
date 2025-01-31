use git2::{Oid, Repository, Sort, Tree, TreeEntry};
use lazy_static::lazy_static;
use serde::Serialize;
use std::{
  collections::HashMap,
  path::{Path, PathBuf},
  sync::Mutex,
  time::{Duration, SystemTime},
};

#[derive(Debug)]
struct CommitCacheEntry {
  commits: Vec<BasicCommit>,
  timestamp: SystemTime,
}

lazy_static! {
  static ref COMMIT_CACHE: Mutex<HashMap<String, CommitCacheEntry>> = Mutex::new(HashMap::new());
}

const CACHE_TTL: Duration = Duration::from_secs(300);

#[derive(Serialize, Clone, Debug)]
pub struct BasicCommit {
  pub id: String,
  pub message: String,
  pub author: String,
  pub date: i64,
}

pub fn find_git_root(start_path: &Path) -> Option<PathBuf> {
  let mut current_path = start_path.to_path_buf();
  loop {
    if current_path.join(".git").exists() {
      return Some(current_path);
    }
    if !current_path.pop() {
      return None;
    }
  }
}

fn get_cached_commits(path: &str) -> Option<Vec<BasicCommit>> {
  let cache = COMMIT_CACHE.lock().ok()?;
  cache.get(path).and_then(|entry| {
    if entry.timestamp.elapsed().ok()? < CACHE_TTL {
      Some(entry.commits.clone())
    } else {
      None
    }
  })
}

fn cache_commits(path: &str, commits: &[BasicCommit]) {
  if let Ok(mut cache) = COMMIT_CACHE.lock() {
    cache.insert(
      path.to_string(),
      CommitCacheEntry {
        commits: commits.to_vec(),
        timestamp: SystemTime::now(),
      },
    );
  }
}

pub async fn process_commits(path: &str) -> Result<Vec<BasicCommit>, String> {
  let path = Path::new(path);
  let git_root = find_git_root(path).ok_or("Could not find Git repository")?;
  let repo =
    Repository::open(&git_root).map_err(|e| format!("Failed to open repository: {}", e))?;
  let relative_path = path
    .strip_prefix(&git_root)
    .map_err(|_| "Failed to get relative path")?
    .to_str()
    .ok_or("Invalid path")?;

  let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
  revwalk
    .set_sorting(Sort::TIME | Sort::TOPOLOGICAL)
    .map_err(|e| e.to_string())?;
  revwalk.simplify_first_parent().map_err(|e| e.to_string())?;
  revwalk.push_head().map_err(|e| e.to_string())?;

  let mut commits = Vec::new();
  let mut oid_cache = HashMap::new();
  let path = Path::new(relative_path);

  for oid in revwalk {
    let oid = oid.map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;

    if is_path_modified(&commit, path, &repo, &mut oid_cache)? {
      commits.push(create_basic_commit(&commit));
    }
  }

  Ok(commits)
}

fn is_path_modified(
  commit: &git2::Commit,
  path: &Path,
  repo: &Repository,
  cache: &mut HashMap<Oid, Option<Oid>>,
) -> Result<bool, String> {
  let commit_tree = commit.tree().map_err(|e| e.to_string())?;
  let commit_oid = get_path_oid(&commit_tree, path, repo, cache)?;

  if commit.parent_count() == 0 {
    return Ok(commit_oid.is_some());
  }

  let parent = match commit.parent(0) {
    Ok(p) => p,
    Err(_) => return Ok(false),
  };

  let parent_tree = parent.tree().map_err(|e| e.to_string())?;
  let parent_oid = get_path_oid(&parent_tree, path, repo, cache)?;

  Ok(commit_oid != parent_oid)
}

fn get_path_oid(
  tree: &Tree,
  path: &Path,
  repo: &Repository,
  cache: &mut HashMap<Oid, Option<Oid>>,
) -> Result<Option<Oid>, String> {
  let tree_oid = tree.id();

  if let Some(oid) = cache.get(&tree_oid) {
    return Ok(*oid);
  }

  let entry_oid = match tree.get_path(path) {
    Ok(entry) => {
      let obj = entry.to_object(repo).map_err(|e| e.to_string())?;
      Some(obj.id())
    }
    Err(_) => None,
  };

  cache.insert(tree_oid, entry_oid);
  Ok(entry_oid)
}

fn get_tree_entry<'a>(
  tree: &'a Tree,
  path: &Path,
  cache: &mut HashMap<git2::Oid, Option<TreeEntry<'a>>>,
) -> Option<TreeEntry<'a>> {
  cache
    .entry(tree.id())
    .or_insert_with(|| tree.get_path(path).ok())
    .clone()
}

fn create_basic_commit(commit: &git2::Commit) -> BasicCommit {
  BasicCommit {
    id: commit.id().to_string(),
    message: commit.message().unwrap_or("").to_string(),
    author: commit.author().name().unwrap_or("").to_string(),
    date: commit.time().seconds(),
  }
}

pub async fn list_folder_commits(
  path: String,
  page: Option<usize>,
  per_page: Option<usize>,
) -> Result<Vec<BasicCommit>, String> {
  let page = page.unwrap_or(1);
  let per_page = per_page.unwrap_or(20);

  if page == 0 || per_page == 0 {
    return Ok(Vec::new());
  }

  let offset = (page - 1) * per_page;

  let cached_commits = if let Some(cached) = get_cached_commits(&path) {
    cached
  } else {
    let commits = process_commits(&path).await?;
    cache_commits(&path, &commits);
    commits
  };

  let total_commits = cached_commits.len();
  let start = offset;
  let end = offset + per_page;

  if start >= total_commits {
    return Ok(Vec::new());
  }

  let end = std::cmp::min(end, total_commits);
  Ok(cached_commits[start..end].to_vec())
}
