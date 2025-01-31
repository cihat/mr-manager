use dashmap::DashMap;
use git2::{BranchType, Oid, Repository, Sort, Tree};
use lru::LruCache;
use serde::Serialize;
use std::{
  num::NonZeroUsize,
  path::{Path, PathBuf},
  sync::Arc,
  time::{Duration, SystemTime},
};

#[derive(Debug)]
struct CommitCacheEntry {
  commits: Arc<[BasicCommit]>,
  timestamp: SystemTime,
}

use std::sync::LazyLock;

static COMMIT_CACHE: LazyLock<DashMap<String, CommitCacheEntry>> = LazyLock::new(|| DashMap::new());
const CACHE_TTL: Duration = Duration::from_secs(300);
const TREE_CACHE_SIZE: NonZeroUsize = unsafe { NonZeroUsize::new_unchecked(4096) };

#[derive(Serialize, Clone, Debug)]
pub struct BasicCommit {
  pub id: String,
  pub message: String,
  pub author: String,
  pub date: i64,
}

pub fn find_git_root(start_path: &Path) -> Option<PathBuf> {
  let mut current_path = start_path.to_path_buf();
  while current_path.pop() {
    if current_path.join(".git").exists() {
      return Some(current_path);
    }
  }
  None
}

fn get_cached_commits(key: &str) -> Option<Arc<[BasicCommit]>> {
  COMMIT_CACHE.get(key).and_then(|entry| {
    if entry.timestamp.elapsed().ok()? < CACHE_TTL {
      Some(entry.commits.clone())
    } else {
      None
    }
  })
}

fn cache_commits(key: &str, commits: &[BasicCommit]) {
  COMMIT_CACHE.insert(
    key.to_string(),
    CommitCacheEntry {
      commits: Arc::from(commits),
      timestamp: SystemTime::now(),
    },
  );
}

pub async fn process_commits(
  path: &str,
  branch: Option<String>,
  remote: Option<String>,
) -> Result<Vec<BasicCommit>, String> {
  let path = Path::new(path);
  let git_root = find_git_root(path).ok_or("Could not find Git repository")?;
  let repo = Repository::open(&git_root).map_err(|e| format!("Failed to open repository: {e}"))?;
  let relative_path = path
    .strip_prefix(&git_root)
    .map_err(|_| "Failed to get relative path")?
    .to_str()
    .ok_or("Invalid path")?;

  let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
  revwalk.set_sorting(Sort::TIME | Sort::TOPOLOGICAL);
  revwalk.simplify_first_parent();

  // Handle branch/remote reference
  if let Some(branch_name) = branch {
    let ref_name = match remote {
      Some(remote_name) => format!("refs/remotes/{}/{}", remote_name, branch_name),
      None => format!("refs/heads/{}", branch_name),
    };

    let reference = repo
      .find_reference(&ref_name)
      .map_err(|e| format!("Failed to find reference '{}': {}", ref_name, e))?;
    let oid = reference
      .target()
      .ok_or_else(|| format!("Reference '{}' has no target", ref_name))?;
    revwalk
      .push(oid)
      .map_err(|e| format!("Failed to push OID {}: {}", oid, e))?;
  } else {
    revwalk
      .push_head()
      .map_err(|e| format!("Failed to push HEAD: {}", e))?;
  }

  let mut commits = Vec::new();
  let mut oid_cache = LruCache::new(TREE_CACHE_SIZE);
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
  cache: &mut LruCache<Oid, Option<Oid>>,
) -> Result<bool, String> {
  let commit_tree = commit.tree().map_err(|e| e.to_string())?;
  let commit_oid = get_path_oid(&commit_tree, path, cache)?;

  if commit.parent_count() == 0 {
    return Ok(commit_oid.is_some());
  }

  let parent = match commit.parent(0) {
    Ok(p) => p,
    Err(_) => return Ok(false),
  };

  let parent_tree = parent.tree().map_err(|e| e.to_string())?;
  let parent_oid = get_path_oid(&parent_tree, path, cache)?;

  Ok(commit_oid != parent_oid)
}

fn get_path_oid(
  tree: &Tree,
  path: &Path,
  cache: &mut LruCache<Oid, Option<Oid>>,
) -> Result<Option<Oid>, String> {
  let tree_oid = tree.id();

  if let Some(oid) = cache.get(&tree_oid) {
    return Ok(*oid);
  }

  let entry_oid = tree.get_path(path).ok().map(|entry| entry.id());
  cache.put(tree_oid, entry_oid);
  Ok(entry_oid)
}

fn create_basic_commit(commit: &git2::Commit) -> BasicCommit {
  BasicCommit {
    id: commit.id().to_string(),
    message: commit.message().unwrap_or("").to_string(),
    author: commit.author().name().unwrap_or("").to_string(),
    date: commit.time().seconds(),
  }
}

#[derive(Serialize)]
pub struct GitReferences {
  pub remotes: Vec<String>,
  pub branches: Vec<String>,
}

pub fn get_git_references(path: &str) -> Result<GitReferences, String> {
  let path = Path::new(path);
  // let git_root = find_git_root(path).ok_or("Could not find Git repository")?;
  let repo = Repository::open(&path).map_err(|e| format!("Failed to open repository: {e}"))?;

  // Get list of remotes
  let remotes = repo
    .remotes()
    .map_err(|e| format!("Failed to get remotes: {e}"))?
    .iter()
    .filter_map(|r| r.map(|s| s.to_string()))
    .collect();

  // Get list of branches (both local and remote)
  let mut branches = Vec::new();

  // Process local branches
  repo
    .branches(Some(BranchType::Local))
    .map_err(|e| format!("Failed to get local branches: {e}"))?
    .try_for_each(|b| {
      let (branch, _) = b.map_err(|e| format!("Branch error: {e}"))?;
      if let Some(name) = branch
        .name()
        .map_err(|e| format!("Branch name error: {e}"))?
      {
        branches.push(name.to_string());
      }
      Ok::<_, String>(())
    })?;

  // Process remote tracking branches
  repo
    .branches(Some(BranchType::Remote))
    .map_err(|e| format!("Failed to get remote branches: {e}"))?
    .try_for_each(|b| {
      let (branch, _) = b.map_err(|e| format!("Branch error: {e}"))?;
      if let Some(name) = branch
        .name()
        .map_err(|e| format!("Branch name error: {e}"))?
      {
        branches.push(name.to_string());
      }
      Ok::<_, String>(())
    })?;

  Ok(GitReferences { remotes, branches })
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
  let offset = (page - 1) * per_page;

  let cache_key = format!(
    "{}|{}|{}",
    path,
    branch.as_deref().unwrap_or(""),
    remote.as_deref().unwrap_or("")
  );

  let cached_commits = match get_cached_commits(&cache_key) {
    Some(cached) => cached,
    None => {
      let commits = process_commits(&path, branch.clone(), remote.clone()).await?;
      let arc_commits = Arc::from(commits.as_slice());
      cache_commits(&cache_key, &arc_commits);
      arc_commits
    }
  };

  let total = cached_commits.len();
  let start = offset.min(total);
  let end = (offset + per_page).min(total);

  Ok(cached_commits[start..end].to_vec())
}
