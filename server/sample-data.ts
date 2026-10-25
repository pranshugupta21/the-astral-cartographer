import { analyzeCodebase } from './analyzer';
import { parseSourceCode, detectLanguage, detectFileRole } from './parser';
import { AnalysisResult, RepoMetadata } from './types';

export function getSampleAnalyses(): Record<string, { meta: RepoMetadata; getResult: () => { analysis: AnalysisResult; files: Record<string, string> } }> {
  return {
    'astral-cartographer': {
      meta: {
        owner: 'astral-atlas',
        repo: 'the-astral-cartographer',
        fullName: 'astral-atlas/the-astral-cartographer',
        description: 'Codebase Intelligence & Architectural Atlas (Self-Map Showcase)',
        defaultBranch: 'main',
        stars: 342,
        isUploaded: false,
      },
      getResult: () => buildAstralSelfAnalysis(),
    },
    'chrono-vault': {
      meta: {
        owner: 'chronos',
        repo: 'chrono-vault-service',
        fullName: 'chronos/chrono-vault-service',
        description: 'Distributed ledger service demonstrating circular dependency detection and high fan-in hubs',
        defaultBranch: 'main',
        stars: 128,
        isUploaded: false,
      },
      getResult: () => buildChronoVaultAnalysis(),
    },
  };
}

function buildAstralSelfAnalysis(): { analysis: AnalysisResult; files: Record<string, string> } {
  const startTime = Date.now();
  const rawMap = new Map<string, { content: string; size: number }>();
  const parsedMap = new Map<string, any>();
  const fileContents: Record<string, string> = {};

  const fileDefinitions: Array<[string, string]> = [
    [
      'README.md',
      `# The Astral Cartographer
The Astral Cartographer transforms GitHub repositories into navigable celestial architectural atlases.
## Architecture Overview
- \`server.ts\`: Express server hosting Vite and architectural endpoints
- \`server/analyzer.ts\`: Graph compilation, Tarjan cycle detection, metrics calculation
- \`server/parser.ts\`: TypeScript Compiler API AST parser and Python scanner
- \`server/github.ts\`: GitHub tree ingest and file retriever
- \`src/App.tsx\`: Main full-screen cartographic dashboard
- \`src/components/AtlasGraph.tsx\`: Interactive Cytoscape dependency atlas
- \`src/components/Inspector.tsx\`: Deep file inspector with source viewer, cycles, and onboarding
`,
    ],
    [
      'package.json',
      `{
  "name": "astral-cartographer",
  "version": "1.0.0",
  "main": "server.ts",
  "dependencies": {
    "cytoscape": "^3.30.0",
    "express": "^4.21.2",
    "typescript": "^7.0.2",
    "@google/genai": "^2.4.0"
  }
}`,
    ],
    [
      'server.ts',
      `import express from 'express';
import { fetchGithubRepository } from './server/github';
import { analyzeCodebase } from './server/analyzer';
import { askCodebaseQuestion } from './server/gemini';
import { processZipBuffer } from './server/zip';

const app = express();
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', engine: 'Astral Cartographer v1.0' });
});

export function startServer() {
  console.log('Astral Cartographer server initialized');
}
`,
    ],
    [
      'server/types.ts',
      `export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'json' | 'markdown';
export type FileRole = 'entry' | 'source' | 'config' | 'doc' | 'test' | 'type';

export interface GraphNode {
  id: string;
  name: string;
  path: string;
  language: SupportedLanguage;
  fileRole: FileRole;
  lineCount: number;
  fanIn: number;
  fanOut: number;
  complexity: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'imports';
  resolved: boolean;
}
`,
    ],
    [
      'server/parser.ts',
      `import ts from 'typescript';
import { SupportedLanguage, FileRole } from './types';

export function detectLanguage(filePath: string): SupportedLanguage {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
  if (filePath.endsWith('.py')) return 'python';
  return 'other' as any;
}

export function parseTypeScriptAST(filePath: string, content: string) {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  return { complexity: 4, warnings: [] };
}
`,
    ],
    [
      'server/analyzer.ts',
      `import { GraphNode, GraphEdge, AnalysisResult } from './types';
import { resolveLocalImport } from './parser';

export function analyzeCodebase(rawFiles: Map<string, any>): AnalysisResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  return { nodes, edges } as any;
}
`,
    ],
    [
      'server/github.ts',
      `import { RepoMetadata } from './types';
import { parseSourceCode, detectLanguage } from './parser';

export async function fetchGithubRepository(owner: string, repo: string) {
  const meta: RepoMetadata = {
    owner,
    repo,
    fullName: \`\${owner}/\${repo}\`,
    description: 'Repository analyzed via GitHub REST API',
    defaultBranch: 'main'
  };
  return { repoMeta: meta, files: new Map(), parsedMap: new Map() };
}
`,
    ],
    [
      'server/gemini.ts',
      `import { GoogleGenAI } from '@google/genai';
import { AnalysisResult } from './types';

export async function askCodebaseQuestion(question: string, analysis: AnalysisResult) {
  return { answer: 'Architectural explanation', evidence: [], isAiPowered: true };
}
`,
    ],
    [
      'server/zip.ts',
      `import AdmZip from 'adm-zip';
import { detectLanguage, parseSourceCode } from './parser';
import { RepoMetadata } from './types';

export function processZipBuffer(buffer: Buffer, archiveName: string) {
  return { repoMeta: {} as RepoMetadata, files: new Map(), parsedMap: new Map() };
}
`,
    ],
    [
      'src/App.tsx',
      `import React, { useState, useEffect } from 'react';
import { AtlasGraph } from './components/AtlasGraph';
import { Inspector } from './components/Inspector';
import { RepoExplorer } from './components/RepoExplorer';
import { TopBar } from './components/TopBar';

export function App() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  return (
    <div className="flex h-screen bg-[#0c0d11]">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <RepoExplorer onSelect={setSelectedFile} />
        <AtlasGraph selectedNodeId={selectedFile} onNodeSelect={setSelectedFile} />
        <Inspector selectedFileId={selectedFile} />
      </div>
    </div>
  );
}
`,
    ],
    [
      'src/components/AtlasGraph.tsx',
      `import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

export interface AtlasGraphProps {
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
}

export function AtlasGraph({ selectedNodeId, onNodeSelect }: AtlasGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  return <div ref={containerRef} className="w-full h-full relative" />;
}
`,
    ],
    [
      'src/components/Inspector.tsx',
      `import React, { useState } from 'react';
import { SourceViewer } from './SourceViewer';
import { HealthReport } from './HealthReport';
import { OnboardingPath } from './OnboardingPath';

export interface InspectorProps {
  selectedFileId: string | null;
}

export function Inspector({ selectedFileId }: InspectorProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'source' | 'health' | 'onboarding'>('overview');
  return <div className="w-96 border-l border-[#262833]" />;
}
`,
    ],
    [
      'src/components/SourceViewer.tsx',
      `import React from 'react';

export function SourceViewer({ code, language }: { code: string; language: string }) {
  return <pre className="font-mono text-xs">{code}</pre>;
}
`,
    ],
    [
      'src/components/HealthReport.tsx',
      `import React from 'react';

export function HealthReport() {
  return <div>Architectural Health & Cycles</div>;
}
`,
    ],
    [
      'src/components/OnboardingPath.tsx',
      `import React from 'react';

export function OnboardingPath() {
  return <div>Guided Developer Onboarding Path</div>;
}
`,
    ],
    [
      'src/components/RepoExplorer.tsx',
      `import React from 'react';

export function RepoExplorer({ onSelect }: { onSelect: (id: string) => void }) {
  return <div className="w-64 border-r border-[#262833]" />;
}
`,
    ],
    [
      'src/components/TopBar.tsx',
      `import React from 'react';

export function TopBar() {
  return <header className="h-14 border-b border-[#262833]" />;
}
`,
    ],
  ];

  for (const [filePath, content] of fileDefinitions) {
    rawMap.set(filePath, { content, size: content.length });
    fileContents[filePath] = content;
    const lang = detectLanguage(filePath);
    const role = detectFileRole(filePath);
    const parsed = parseSourceCode(filePath, content, lang);
    parsedMap.set(filePath, { ...parsed, language: lang, fileRole: role });
  }

  const meta: RepoMetadata = {
    owner: 'astral-atlas',
    repo: 'the-astral-cartographer',
    fullName: 'astral-atlas/the-astral-cartographer',
    description: 'Codebase Intelligence & Architectural Atlas (Self-Map Showcase)',
    defaultBranch: 'main',
    stars: 342,
    isUploaded: false,
    sourceUrl: 'https://github.com/astral-atlas/the-astral-cartographer',
  };

  const analysis = analyzeCodebase(rawMap, meta, parsedMap, startTime);
  return { analysis, files: fileContents };
}

function buildChronoVaultAnalysis(): { analysis: AnalysisResult; files: Record<string, string> } {
  const startTime = Date.now();
  const rawMap = new Map<string, { content: string; size: number }>();
  const parsedMap = new Map<string, any>();
  const fileContents: Record<string, string> = {};

  const fileDefinitions: Array<[string, string]> = [
    [
      'README.md',
      `# Chrono-Vault Service
High-throughput distributed ledger service with cryptographic audit trails.
Contains realistic circular dependencies between auth and session managers to test architectural loop detectors.
`,
    ],
    [
      'package.json',
      `{
  "name": "chrono-vault-service",
  "version": "2.4.0",
  "main": "src/index.ts",
  "dependencies": {
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2"
  }
}`,
    ],
    [
      'src/index.ts',
      `import { app } from './app';
import { connectDatabase } from './db/connection';
import { logger } from './utils/logger';

async function bootstrap() {
  logger.info('Connecting to storage cluster...');
  await connectDatabase();
  app.listen(8080, () => {
    logger.info('Chrono-Vault running on port 8080');
  });
}

bootstrap();
`,
    ],
    [
      'src/app.ts',
      `import express from 'express';
import { ledgerRouter } from './routes/ledger';
import { authRouter } from './routes/auth';

export const app = express();
app.use(express.json());
app.use('/api/ledger', ledgerRouter);
app.use('/api/auth', authRouter);
`,
    ],
    [
      'src/routes/ledger.ts',
      `import { Router } from 'express';
import { LedgerService } from '../services/ledger';
import { requireAuth } from '../middleware/auth';

export const ledgerRouter = Router();
const service = new LedgerService();

ledgerRouter.get('/records', requireAuth, async (req, res) => {
  const records = await service.listRecent();
  res.json({ records });
});
`,
    ],
    [
      'src/routes/auth.ts',
      `import { Router } from 'express';
import { AuthService } from '../services/auth';

export const authRouter = Router();
const authService = new AuthService();

authRouter.post('/login', async (req, res) => {
  const token = await authService.authenticate(req.body.user, req.body.pass);
  res.json({ token });
});
`,
    ],
    [
      'src/services/ledger.ts',
      `import { LedgerModel } from '../models/ledger';
import { auditLog } from '../utils/audit';

export class LedgerService {
  async listRecent() {
    auditLog('Queried ledger history');
    return LedgerModel.queryAll();
  }
}
`,
    ],
    [
      // Intentional circular dependency: auth -> session -> auth
      'src/services/auth.ts',
      `import { SessionManager } from './session';
import { UserModel } from '../models/user';
import { logger } from '../utils/logger';

export class AuthService {
  private sessionMgr = new SessionManager();

  async authenticate(user: string, pass: string): Promise<string> {
    logger.info('Authenticating user: ' + user);
    const record = await UserModel.find(user);
    if (!record) throw new Error('User not found');
    return this.sessionMgr.createSession(record.id);
  }

  validateToken(token: string): boolean {
    return this.sessionMgr.isValid(token);
  }
}
`,
    ],
    [
      // Intentional circular dependency back to auth
      'src/services/session.ts',
      `import { AuthService } from './auth';
import { logger } from '../utils/logger';

export class SessionManager {
  private sessions = new Map<string, string>();

  createSession(userId: string): string {
    const token = 'tok_' + Math.random().toString(36);
    this.sessions.set(token, userId);
    return token;
  }

  isValid(token: string): boolean {
    const userId = this.sessions.get(token);
    if (!userId) return false;
    // Circular call back to AuthService for revocation checks:
    const auth = new AuthService();
    return true;
  }
}
`,
    ],
    [
      'src/middleware/auth.ts',
      `import { AuthService } from '../services/auth';

const authService = new AuthService();

export function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authService.validateToken(authHeader)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
`,
    ],
    [
      'src/models/user.ts',
      `export interface UserRecord {
  id: string;
  username: string;
  roles: string[];
}

export class UserModel {
  static async find(username: string): Promise<UserRecord | null> {
    return { id: 'usr_1', username, roles: ['admin'] };
  }
}
`,
    ],
    [
      'src/models/ledger.ts',
      `export interface LedgerEntry {
  id: string;
  hash: string;
  timestamp: number;
}

export class LedgerModel {
  static async queryAll(): Promise<LedgerEntry[]> {
    return [];
  }
}
`,
    ],
    [
      'src/db/connection.ts',
      `import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  logger.info('Storage pool established at vault://cluster-primary');
}
`,
    ],
    [
      'src/utils/logger.ts',
      `export const logger = {
  info: (msg: string) => console.log('[INFO]', msg),
  warn: (msg: string) => console.warn('[WARN]', msg),
  error: (msg: string) => console.error('[ERR]', msg),
};
`,
    ],
    [
      'src/utils/audit.ts',
      `import { logger } from './logger';

export function auditLog(action: string) {
  logger.info('[AUDIT] ' + action + ' at ' + new Date().toISOString());
}
`,
    ],
  ];

  for (const [filePath, content] of fileDefinitions) {
    rawMap.set(filePath, { content, size: content.length });
    fileContents[filePath] = content;
    const lang = detectLanguage(filePath);
    const role = detectFileRole(filePath);
    const parsed = parseSourceCode(filePath, content, lang);
    parsedMap.set(filePath, { ...parsed, language: lang, fileRole: role });
  }

  const meta: RepoMetadata = {
    owner: 'chronos',
    repo: 'chrono-vault-service',
    fullName: 'chronos/chrono-vault-service',
    description: 'Distributed ledger service demonstrating circular dependency detection and high fan-in hubs',
    defaultBranch: 'main',
    stars: 128,
    isUploaded: false,
    sourceUrl: 'https://github.com/chronos/chrono-vault-service',
  };

  const analysis = analyzeCodebase(rawMap, meta, parsedMap, startTime);
  return { analysis, files: fileContents };
}
