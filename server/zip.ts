import AdmZip from 'adm-zip';
import path from 'path';
import { RepoMetadata } from './types';
import { detectLanguage, detectFileRole, parseSourceCode } from './parser';

const MAX_ZIP_FILES = 120;
const MAX_FILE_SIZE_BYTES = 300 * 1024; // 300KB per file

const IGNORED_DIRS = [
  'node_modules',
  'dist',
  'build',
  'out',
  '.git',
  '.next',
  '.nuxt',
  'venv',
  '.venv',
  '__pycache__',
  '.turbo',
  'coverage',
];

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

export function processZipBuffer(
  buffer: Buffer,
  archiveName: string
): {
  repoMeta: RepoMetadata;
  files: Map<string, { content: string; size: number }>;
  parsedMap: Map<string, any>;
} {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch (err: any) {
    throw new Error(`Invalid or corrupted ZIP archive: ${err.message || String(err)}`);
  }

  const zipEntries = zip.getEntries();
  if (zipEntries.length === 0) {
    throw new Error('The uploaded ZIP archive is empty.');
  }

  // Detect root folder prefix if the zip wraps everything inside e.g. "repo-main/"
  let commonPrefix = '';
  const firstNonEmpty = zipEntries.find((e) => !e.isDirectory);
  if (firstNonEmpty) {
    const parts = firstNonEmpty.entryName.split('/');
    if (parts.length > 1) {
      const candidatePrefix = parts[0] + '/';
      const allSharePrefix = zipEntries.every(
        (e) => e.entryName.startsWith(candidatePrefix) || e.entryName === parts[0]
      );
      if (allSharePrefix) {
        commonPrefix = candidatePrefix;
      }
    }
  }

  const files = new Map<string, { content: string; size: number }>();
  const parsedMap = new Map<string, any>();
  let processedCount = 0;

  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;

    let normalizedPath = entry.entryName;
    if (commonPrefix && normalizedPath.startsWith(commonPrefix)) {
      normalizedPath = normalizedPath.substring(commonPrefix.length);
    }

    // Path traversal check
    if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
      continue; // Skip dangerous paths
    }

    const segments = normalizedPath.split('/');
    if (segments.some((s) => IGNORED_DIRS.includes(s))) {
      continue;
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      continue;
    }

    if (entry.header.size > MAX_FILE_SIZE_BYTES) {
      continue; // Skip oversized single files
    }

    if (processedCount >= MAX_ZIP_FILES) {
      break;
    }

    try {
      const rawText = entry.getData().toString('utf8');
      files.set(normalizedPath, {
        content: rawText,
        size: entry.header.size,
      });

      const lang = detectLanguage(normalizedPath);
      const role = detectFileRole(normalizedPath);
      const parsed = parseSourceCode(normalizedPath, rawText, lang);
      parsedMap.set(normalizedPath, { ...parsed, language: lang, fileRole: role });
      processedCount++;
    } catch (e) {
      console.warn(`Failed to read ZIP entry ${entry.entryName}:`, e);
    }
  }

  if (files.size === 0) {
    throw new Error(
      'No supported source code files (.ts, .js, .py, .json, .md) could be extracted from the archive.'
    );
  }

  const baseName = path.basename(archiveName, path.extname(archiveName)) || 'uploaded-project';

  const repoMeta: RepoMetadata = {
    owner: 'local',
    repo: baseName,
    fullName: `local/${baseName}`,
    description: `Uploaded archive: ${archiveName} (${files.size} source files)`,
    defaultBranch: 'local',
    isUploaded: true,
  };

  return { repoMeta, files, parsedMap };
}
