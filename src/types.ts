export interface RepositoryData {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  files: FileData[];
  analysis?: string;
}

export interface FileData {
  name: string;
  path: string;
  content: string;
  size: number;
}