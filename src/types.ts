export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'json' | 'markdown' | 'other';
export type FileRole = 'entry' | 'source' | 'config' | 'doc' | 'test' | 'type' | 'asset';

export interface ExtractedImport {
  raw: string;
  source: string;
  resolvedPath?: string;
  isExternal: boolean;
  isLocal: boolean;
  importedSymbols: string[];
  line?: number;
}

export interface ExtractedExport {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'type' | 'interface' | 'default';
  line?: number;
}

export interface ExtractedDeclaration {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable';
  line: number;
}

export interface IndexedFileMeta {
  id: string;
  path: string;
  name: string;
  language: SupportedLanguage;
  fileRole: FileRole;
  size: number;
  lineCount: number;
  imports: ExtractedImport[];
  exports: ExtractedExport[];
  declarations: ExtractedDeclaration[];
  fanIn: number;
  fanOut: number;
  complexity: number;
  parsingWarnings: string[];
}

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
  directory: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'imports';
  resolved: boolean;
  confidence: 'high' | 'heuristic';
  symbols: string[];
}

export interface DependencyCycle {
  id: string;
  length: number;
  files: string[];
  severity: 'critical' | 'warning';
}

export interface ArchitecturalMetrics {
  totalFiles: number;
  analyzedFiles: number;
  totalLines: number;
  resolvedEdgesCount: number;
  unresolvedImportsCount: number;
  externalImportsCount: number;
  circularDependencyCount: number;
  averageFanOut: number;
  maxFanIn: { file: string; count: number };
  maxFanOut: { file: string; count: number };
  languageDistribution: Record<string, number>;
  analysisDurationMs: number;
}

export interface ArchitecturalFinding {
  id: string;
  title: string;
  category: 'cycle' | 'coupling' | 'complexity' | 'dead_code' | 'organization';
  severity: 'high' | 'medium' | 'low' | 'info';
  affectedFiles: string[];
  evidence: string;
  impact: string;
  recommendation: string;
}

export interface OnboardingStep {
  rank: number;
  fileId: string;
  filePath: string;
  fileName: string;
  role: string;
  reason: string;
  keySymbols: string[];
  dependencies: string[];
  dependents: string[];
}

export interface RepoMetadata {
  owner: string;
  repo: string;
  fullName: string;
  description: string;
  defaultBranch: string;
  stars?: number;
  isUploaded?: boolean;
  sourceUrl?: string;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  repo: RepoMetadata;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: ArchitecturalMetrics;
  findings: ArchitecturalFinding[];
  cycles: DependencyCycle[];
  onboardingPath: OnboardingStep[];
  filesIndex: Record<string, IndexedFileMeta>;
}
