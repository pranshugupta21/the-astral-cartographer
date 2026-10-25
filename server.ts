import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { parseGithubUrl, fetchGithubRepository } from './server/github';
import { analyzeCodebase } from './server/analyzer';
import { processZipBuffer } from './server/zip';
import { askCodebaseQuestion } from './server/gemini';
import { getSampleAnalyses } from './server/sample-data';
import { AnalysisResult, IndexedFile } from './server/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory analysis cache
interface CachedAnalysis {
  analysis: AnalysisResult;
  files: Record<string, string>; // filePath -> content
}

const analysisCache = new Map<string, CachedAnalysis>();

// Preload sample analyses into cache
const samples = getSampleAnalyses();
for (const [key, sample] of Object.entries(samples)) {
  const result = sample.getResult();
  analysisCache.set(key, {
    analysis: result.analysis,
    files: result.files,
  });
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // JSON payload parser (up to 30mb for zip uploads and source trees)
  app.use(express.json({ limit: '35mb' }));

  // --- API Endpoints ---

  // Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      engine: 'The Astral Cartographer (AST Codebase Intelligence)',
      geminiAvailable: Boolean(process.env.GEMINI_API_KEY),
      githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN),
      cachedAnalyses: analysisCache.size,
    });
  });

  // Get available demo showcase repositories
  app.get('/api/samples', (req, res) => {
    const list = Object.entries(samples).map(([key, item]) => ({
      key,
      meta: item.meta,
    }));
    res.json(list);
  });

  // Load a demo showcase
  app.post('/api/samples/:key', (req, res) => {
    const { key } = req.params;
    const cached = analysisCache.get(key);
    if (!cached) {
      return res.status(404).json({ error: `Sample '${key}' not found` });
    }
    res.json({
      analysisId: key,
      analysis: cached.analysis,
      isSample: true,
    });
  });

  // Ingest GitHub Repository URL
  app.post('/api/analyze', async (req, res) => {
    const { repoUrl, maxFiles } = req.body;
    if (!repoUrl || typeof repoUrl !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid GitHub repository URL.' });
    }

    const startTime = Date.now();

    try {
      const { owner, repo } = parseGithubUrl(repoUrl);
      const limit = typeof maxFiles === 'number' && maxFiles > 0 ? Math.min(maxFiles, 100) : 75;

      const { repoMeta, files, parsedMap } = await fetchGithubRepository(owner, repo, limit);

      const analysis = analyzeCodebase(files, repoMeta, parsedMap, startTime);

      // Store in cache
      const fileContents: Record<string, string> = {};
      for (const [p, val] of files.entries()) {
        fileContents[p] = val.content;
      }

      analysisCache.set(analysis.id, {
        analysis,
        files: fileContents,
      });

      res.json({
        analysisId: analysis.id,
        analysis,
      });
    } catch (err: any) {
      console.error('Error analyzing GitHub repository:', err);
      res.status(400).json({
        error: err.message || 'Failed to analyze repository.',
      });
    }
  });

  //  ZIP archive upload
  app.post('/api/analyze/upload', async (req, res) => {
    const { name, base64 } = req.body;
    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ error: 'Please provide a valid ZIP archive payload.' });
    }

    const startTime = Date.now();

    try {
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length > 25 * 1024 * 1024) {
        return res.status(400).json({ error: 'ZIP archive exceeds 25MB limit.' });
      }

      const { repoMeta, files, parsedMap } = processZipBuffer(buffer, name || 'archive.zip');
      const analysis = analyzeCodebase(files, repoMeta, parsedMap, startTime);

      const fileContents: Record<string, string> = {};
      for (const [p, val] of files.entries()) {
        fileContents[p] = val.content;
      }

      analysisCache.set(analysis.id, {
        analysis,
        files: fileContents,
      });

      res.json({
        analysisId: analysis.id,
        analysis,
      });
    } catch (err: any) {
      console.error('Error analyzing ZIP archive:', err);
      res.status(400).json({
        error: err.message || 'Failed to inspect ZIP archive.',
      });
    }
  });

  // Fetch full analysis result
  app.get('/api/analysis/:id', (req, res) => {
    const cached = analysisCache.get(req.params.id);
    if (!cached) {
      return res.status(404).json({ error: 'Analysis not found or session expired.' });
    }
    res.json(cached.analysis);
  });

  // Fetch individual file content for inspection
  app.get('/api/analysis/:id/file', (req, res) => {
    const { id } = req.params;
    const filePath = req.query.path as string;

    const cached = analysisCache.get(id);
    if (!cached) {
      return res.status(404).json({ error: 'Analysis session not found.' });
    }

    if (!filePath || !cached.files[filePath]) {
      return res.status(404).json({ error: `File '${filePath}' not found in analyzed index.` });
    }

    const fileMeta = cached.analysis.filesIndex[filePath];
    res.json({
      id: filePath,
      path: filePath,
      content: cached.files[filePath],
      metadata: fileMeta,
    });
  });

  // Ask codebase question (Gemini grounded Q&A)
  app.post('/api/analysis/:id/ask', async (req, res) => {
    const { id } = req.params;
    const { question, selectedFileId } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Please provide a question.' });
    }

    const cached = analysisCache.get(id);
    if (!cached) {
      return res.status(404).json({ error: 'Analysis session not found.' });
    }

    try {
      const fullFilesMap: Record<string, IndexedFile> = {};
      for (const [p, meta] of Object.entries(cached.analysis.filesIndex)) {
        fullFilesMap[p] = {
          ...meta,
          content: cached.files[p],
        };
      }

      const result = await askCodebaseQuestion(
        question,
        cached.analysis,
        selectedFileId,
        fullFilesMap
      );
      res.json(result);
    } catch (err: any) {
      console.error('Error answering question:', err);
      res.status(500).json({ error: err.message || 'Error processing question.' });
    }
  });

  // Vite middleware in dev, static in prod
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`The Astral Cartographer server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
