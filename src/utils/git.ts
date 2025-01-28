export const getCommitUrl = (repoUrl: string, commitId: string) => {
  if (!commitId || !repoUrl) {
    return '';
  }
  
  if (repoUrl.includes('github.com')) {
    return `${repoUrl}/commit/${commitId}`;
  }
  if (repoUrl.includes('gitlab.com')) {
    return `${repoUrl}/-/commit/${commitId}`;
  }
  if (repoUrl.includes('bitbucket.org')) {
    return `${repoUrl}/commits/${commitId}`;
  }

  return '';
};
