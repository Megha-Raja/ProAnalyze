import { Octokit } from 'octokit';
import { FileData } from '../types';

const octokit = new Octokit({
  auth: import.meta.env.VITE_GITHUB_TOKEN,
});

export async function parseRepoUrl(url: string) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  return { owner: match[1], repo: match[2] };
}

export async function fetchRepositoryData(owner: string, repo: string) {
  const { data: repoData } = await octokit.rest.repos.get({
    owner,
    repo,
  });

  const { data: contents } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: '',
  });

  const files: FileData[] = [];
  
  async function processContent(path: string) {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.type === 'file') {
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: item.path,
          });
          
          if ('content' in fileData) {
            files.push({
              name: item.name,
              path: item.path,
              content: atob(fileData.content.replace(/\n/g, '')),
              size: fileData.size,
            });
          }
        } else if (item.type === 'dir') {
          await processContent(item.path);
        }
      }
    }
  }

  await processContent('');

  return {
    name: repoData.name,
    description: repoData.description || '',
    language: repoData.language || 'Unknown',
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    files,
  };
}