import { RepoMetadata } from './types';
import { detectLanguage, detectFileRole, parseSourceCode } from './parser';

export interface ParsedGithubUrl {
  owner: string;
  repo: string;
}

export function parseGithubUrl(rawUrl: string): ParsedGithubUrl {
  const cleaned = rawUrl.trim();
  const regex = /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git|\/.*)?$/;
  const match = cleaned.match(regex);

  if (!match) {
    throw new Error(
      `Invalid GitHub repository URL: "${rawUrl}". Please provide a URL in the format https://github.com/owner/repository`
    );
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
  };
}

const IGNORED_DIRS = [
  'node_modules',
  'dist',
  'build',
  'out',
  '.git',
  '.next',
  '.nuxt',
  '.cache',
  'coverage',
  '.vscode',
  '.idea',
  'venv',
  '.venv',
  'env',
  '__pycache__',
  'vendor',
  '.turbo',
  'target',
  'bin',
  'obj',
];

const IGNORED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.mp4',
  '.mov',
  '.mp3',
  '.wav',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.pdf',
  '.ttf',
  '.woff',
  '.woff2',
  '.eot',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.iso',
  '.map',
  '.lock',
  '.min.js',
  '.min.css',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.json',
  '.md',
]);

export async function fetchGithubRepository(
  owner: string,
  repo: string,
  maxFilesLimit = 75
): Promise<{
  repoMeta: RepoMetadata;
  files: Map<string, { content: string; size: number }>;
  parsedMap: Map<string, any>;
}> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Astral-Cartographer/1.0 (Hackathon Architecture Tool)',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // 1. Fetch Repo Metadata
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
  });

  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error(
        `Repository "${owner}/${repo}" was not found or is private. Only public repositories can be inspected.`
      );
    }
    if (repoRes.status === 403) {
      const rateLimitReset = repoRes.headers.get('x-ratelimit-reset');
      const resetTime = rateLimitReset
        ? new Date(Number(rateLimitReset) * 1000).toLocaleTimeString()
        : 'in a few minutes';
      throw new Error(
        `GitHub API rate limit exceeded for public requests. Limit resets at ${resetTime}. You may use the ZIP upload or demo showcase in the meantime.`
      );
    }
    throw new Error(`GitHub API error (${repoRes.status}): ${repoRes.statusText}`);
  }

  const repoData = (await repoRes.json()) as any;
  const defaultBranch = repoData.default_branch || 'main';

  const repoMeta: RepoMetadata = {
    owner,
    repo,
    fullName: repoData.full_name,
    description: repoData.description || 'Public GitHub Repository',
    defaultBranch,
    stars: repoData.stargazers_count,
    sourceUrl: repoData.html_url,
  };

  // 2. Fetch Git Tree
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
  const treeRes = await fetch(treeUrl, { headers });

  if (!treeRes.ok) {
    throw new Error(`Failed to retrieve repository file tree (${treeRes.status}): ${treeRes.statusText}`);
  }

  const treeData = (await treeRes.json()) as any;
  const rawTree: Array<{ path: string; type: string; size?: number; url: string }> =
    treeData.tree || [];

  // 3. Filter files
  const candidateFiles = rawTree.filter((item) => {
    if (item.type !== 'blob') return false;
    const parts = item.path.split('/');
    if (parts.some((p) => IGNORED_DIRS.includes(p))) return false;

    const lowerPath = item.path.toLowerCase();
    for (const ext of IGNORED_EXTENSIONS) {
      if (lowerPath.endsWith(ext)) return false;
    }

    const dotIndex = item.path.lastIndexOf('.');
    if (dotIndex === -1) return false;
    const ext = item.path.substring(dotIndex).toLowerCase();
    return ALLOWED_EXTENSIONS.has(ext);
  });

  if (candidateFiles.length === 0) {
    throw new Error(
      `No supported source code files (.ts, .js, .py, .json) found in ${owner}/${repo}.`
    );
  }

  // 4. Prioritize files: entry points, src/, README, package.json
  candidateFiles.sort((a, b) => {
    const score = (p: string) => {
      const lower = p.toLowerCase();
      if (lower === 'readme.md') return 100;
      if (lower === 'package.json') return 95;
      if (lower.includes('main.') || lower.includes('index.') || lower.includes('app.') || lower.includes('server.')) return 90;
      if (lower.startsWith('src/')) return 80;
      if (lower.startsWith('lib/') || lower.startsWith('app/')) return 70;
      if (lower.includes('test') || lower.includes('spec')) return 10;
      return 50;
    };
    return score(b.path) - score(a.path);
  });

  const selectedFiles = candidateFiles.slice(0, maxFilesLimit);

  // 5. Fetch file contents in bounded batches
  const files = new Map<string, { content: string; size: number }>();
  const parsedMap = new Map<string, any>();

  const BATCH_SIZE = 6;
  for (let i = 0; i < selectedFiles.length; i += BATCH_SIZE) {
    const batch = selectedFiles.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (fileItem) => {
        try {
          // Use raw.githubusercontent.com for fast bounded retrieval
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${encodeURIComponent(
            fileItem.path
          ).replace(/%2F/g, '/')}`;

          const fileRes = await fetch(rawUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: AbortSignal.timeout(10000),
          });

          if (fileRes.ok) {
            const text = await fileRes.text();
            // Cap single file size to 250KB for analysis performance
            const content = text.length > 250000 ? text.substring(0, 250000) : text;
            files.set(fileItem.path, {
              content,
              size: fileItem.size || content.length,
            });

            const lang = detectLanguage(fileItem.path);
            const role = detectFileRole(fileItem.path);
            const parsed = parseSourceCode(fileItem.path, content, lang);
            parsedMap.set(fileItem.path, { ...parsed, language: lang, fileRole: role });
          }
        } catch (err) {
          console.warn(`Failed to fetch file ${fileItem.path}:`, err);
        }
      })
    );
  }

  return { repoMeta, files, parsedMap };
}
