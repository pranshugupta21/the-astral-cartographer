import path from 'path';
import {
  IndexedFile,
  GraphNode,
  GraphEdge,
  DependencyCycle,
  ArchitecturalMetrics,
  ArchitecturalFinding,
  OnboardingStep,
  AnalysisResult,
  RepoMetadata,
} from './types';
import { resolveLocalImport } from './parser';

export function analyzeCodebase(
  rawFiles: Map<string, { content: string; size: number }>,
  repoMeta: RepoMetadata,
  parsedFiles: Map<string, any>,
  startTimeMs: number
): AnalysisResult {
  const allPathsSet = new Set<string>(rawFiles.keys());
  const indexedFiles: Record<string, IndexedFile> = {};
  const edges: GraphEdge[] = [];
  const edgeIdSet = new Set<string>();

  // 1. Initial indexing
  for (const [filePath, { content, size }] of rawFiles.entries()) {
    const parsed = parsedFiles.get(filePath) || {
      imports: [],
      exports: [],
      declarations: [],
      complexity: 1,
      warnings: [],
    };

    const lines = content.split('\n');
    const name = path.basename(filePath);

    indexedFiles[filePath] = {
      id: filePath,
      path: filePath,
      name,
      language: parsed.language || 'other',
      fileRole: parsed.fileRole || 'source',
      size,
      lineCount: lines.length,
      imports: parsed.imports,
      exports: parsed.exports,
      declarations: parsed.declarations,
      fanIn: 0,
      fanOut: 0,
      complexity: parsed.complexity,
      parsingWarnings: parsed.warnings,
      content,
    };
  }

  // 2. Resolve imports and construct directed edges (source imports target)
  let resolvedEdgesCount = 0;
  let unresolvedImportsCount = 0;
  let externalImportsCount = 0;

  for (const filePath of Object.keys(indexedFiles)) {
    const file = indexedFiles[filePath];
    for (const imp of file.imports) {
      if (imp.isExternal) {
        externalImportsCount++;
        continue;
      }

      const resolved = resolveLocalImport(filePath, imp.source, allPathsSet);
      if (resolved && indexedFiles[resolved]) {
        imp.resolvedPath = resolved;
        const edgeId = `${filePath}-->${resolved}`;
        if (!edgeIdSet.has(edgeId) && filePath !== resolved) {
          edgeIdSet.add(edgeId);
          edges.push({
            id: edgeId,
            source: filePath,
            target: resolved,
            type: 'imports',
            resolved: true,
            confidence: 'high',
            symbols: imp.importedSymbols,
          });
          resolvedEdgesCount++;
          file.fanOut++;
          indexedFiles[resolved].fanIn++;
        }
      } else {
        unresolvedImportsCount++;
      }
    }
  }

  // 3. Build Graph Nodes
  const nodes: GraphNode[] = Object.values(indexedFiles).map((f) => ({
    id: f.id,
    name: f.name,
    path: f.path,
    language: f.language,
    fileRole: f.fileRole,
    lineCount: f.lineCount,
    fanIn: f.fanIn,
    fanOut: f.fanOut,
    complexity: f.complexity,
    directory: path.dirname(f.path) === '.' ? 'root' : path.dirname(f.path),
  }));

  // 4. Circular Dependency Detection via DFS
  const cycles = detectCycles(indexedFiles, edges);

  // 5. Compute Architectural Metrics
  let totalLines = 0;
  let maxFanIn = { file: 'none', count: 0 };
  let maxFanOut = { file: 'none', count: 0 };
  const languageDistribution: Record<string, number> = {};

  for (const f of Object.values(indexedFiles)) {
    totalLines += f.lineCount;
    if (f.fanIn > maxFanIn.count) {
      maxFanIn = { file: f.id, count: f.fanIn };
    }
    if (f.fanOut > maxFanOut.count) {
      maxFanOut = { file: f.id, count: f.fanOut };
    }
    languageDistribution[f.language] = (languageDistribution[f.language] || 0) + 1;
  }

  const averageFanOut =
    nodes.length > 0
      ? Number((resolvedEdgesCount / nodes.length).toFixed(2))
      : 0;

  const durationMs = Math.max(1, Date.now() - startTimeMs);

  const metrics: ArchitecturalMetrics = {
    totalFiles: rawFiles.size,
    analyzedFiles: nodes.length,
    totalLines,
    resolvedEdgesCount,
    unresolvedImportsCount,
    externalImportsCount,
    circularDependencyCount: cycles.length,
    averageFanOut,
    maxFanIn,
    maxFanOut,
    languageDistribution,
    analysisDurationMs: durationMs,
  };

  // 6. Generate Architectural Findings
  const findings = generateFindings(nodes, edges, cycles, indexedFiles);

  // 7. Generate Smart Onboarding Recommendations
  const onboardingPath = generateOnboardingPath(nodes, edges, indexedFiles);

  // 8. Prepare metadata index (without large content strings to keep payload lightweight)
  const filesIndex: Record<string, Omit<IndexedFile, 'content'>> = {};
  for (const [id, f] of Object.entries(indexedFiles)) {
    const { content, ...meta } = f;
    filesIndex[id] = meta;
  }

  return {
    id: `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    repo: repoMeta,
    nodes,
    edges,
    metrics,
    findings,
    cycles,
    onboardingPath,
    filesIndex,
  };
}

/**
 * Detects cycles in directed graph of local file dependencies.
 * Returns unique cycles with their constituent files.
 */
function detectCycles(
  files: Record<string, IndexedFile>,
  edges: GraphEdge[]
): DependencyCycle[] {
  const adj = new Map<string, string[]>();                    
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const currentPath: string[] = [];
  const foundCycles: DependencyCycle[] = [];
  const seenCycleSignatures = new Set<string>();

  function dfs(node: string) {
    visited.add(node);
    recursionStack.add(node);
    currentPath.push(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);                                         //DFS 
      } else if (recursionStack.has(neighbor)) {
        // Cycle detected from neighbor to current
        const cycleStartIndex = currentPath.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cycleFiles = currentPath.slice(cycleStartIndex);
          cycleFiles.push(neighbor); // Close loop: [A, B, A]

          // Canonical signature to avoid duplicates of same ring (e.g. A->B->A vs B->A->B)
          const ring = cycleFiles.slice(0, -1);
          const minElem = [...ring].sort()[0];
          const minIdx = ring.indexOf(minElem);
          const normalized = [...ring.slice(minIdx), ...ring.slice(0, minIdx)].join('->');

          if (!seenCycleSignatures.has(normalized)) {
            seenCycleSignatures.add(normalized);
            foundCycles.push({
              id: `cycle_${foundCycles.length + 1}`,
              length: ring.length,
              files: cycleFiles,
              severity: ring.length === 2 ? 'critical' : 'warning',
            });
          }
        }
      }
    }

    recursionStack.delete(node);
    currentPath.pop();
  }

  for (const node of Object.keys(files)) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return foundCycles;
}

function generateFindings(
  nodes: GraphNode[],
  edges: GraphEdge[],
  cycles: DependencyCycle[],
  files: Record<string, IndexedFile>
): ArchitecturalFinding[] {
  const findings: ArchitecturalFinding[] = [];

  // Finding 1: Circular Dependencies
  if (cycles.length > 0) {
    const sampleCycles = cycles.slice(0, 3);
    const affected = Array.from(new Set(cycles.flatMap((c) => c.files)));
    findings.push({
      id: 'finding_circular_deps',
      title: `${cycles.length} Circular Dependency Loop${cycles.length > 1 ? 's' : ''} Detected`,
      category: 'cycle',
      severity: cycles.some((c) => c.severity === 'critical') ? 'high' : 'medium',
      affectedFiles: affected,
      evidence: sampleCycles
        .map((c) => c.files.map((p) => path.basename(p)).join(' ⇄ '))
        .join('; '),
      impact:
        'Circular dependencies hinder modularity, prevent dead-code elimination (tree-shaking), risk undefined runtime initialization order, and tightly couple module lifecycles.',
      recommendation:
        'Extract shared interfaces, types, or utility logic into an independent leaf module or apply dependency inversion.',
    });
  }

  // Finding 2: High Fan-In Hotspots (God modules / Reused cores)
  const highFanInNodes = nodes
    .filter((n) => n.fanIn >= 4)
    .sort((a, b) => b.fanIn - a.fanIn);

  if (highFanInNodes.length > 0) {
    const top = highFanInNodes[0];
    findings.push({
      id: 'finding_high_fanin',
      title: `Central Coupling Hub: ${top.name}`,
      category: 'coupling',
      severity: top.fanIn >= 8 ? 'medium' : 'low',
      affectedFiles: highFanInNodes.slice(0, 4).map((n) => n.id),
      evidence: `${top.name} is imported by ${top.fanIn} other modules in this codebase.`,
      impact:
        'Changes to this module carry a high blast radius. A regression here is likely to cascade across numerous dependent modules.',
      recommendation:
        'Treat this interface as a stable contract. Ensure comprehensive regression tests and consider freezing or isolating its exports.',
    });
  }

  // Finding 3: High Fan-Out (Orchestrators with heavy outgoing dependencies)
  const highFanOutNodes = nodes
    .filter((n) => n.fanOut >= 5)
    .sort((a, b) => b.fanOut - a.fanOut);

  if (highFanOutNodes.length > 0) {
    const top = highFanOutNodes[0];
    findings.push({
      id: 'finding_high_fanout',
      title: `Heavy Orchestrator: ${top.name}`,
      category: 'coupling',
      severity: 'low',
      affectedFiles: highFanOutNodes.slice(0, 3).map((n) => n.id),
      evidence: `${top.name} directly imports ${top.fanOut} local modules.`,
      impact:
        'This module depends heavily on multiple external subsystems, making it sensitive to upstream interface updates.',
      recommendation:
        'Verify if this module acts as a facade or router. If it contains business logic, consider decoupling sub-responsibilities.',
    });
  }

  // Finding 4: High Cyclomatic Complexity
  const complexNodes = nodes
    .filter((n) => n.complexity >= 15)
    .sort((a, b) => b.complexity - a.complexity);

  if (complexNodes.length > 0) {
    findings.push({
      id: 'finding_complexity',
      title: `High Control-Flow Complexity in ${complexNodes.length} File${complexNodes.length > 1 ? 's' : ''}`,
      category: 'complexity',
      severity: complexNodes[0].complexity > 25 ? 'medium' : 'low',
      affectedFiles: complexNodes.slice(0, 5).map((n) => n.id),
      evidence: `Top file '${complexNodes[0].name}' has cyclomatic complexity score of ${complexNodes[0].complexity}.`,
      impact:
        'Extensive branching, conditionals, and nested loops increase maintenance cognitive overhead and bug risk.',
      recommendation:
        'Decompose dense functions into smaller pure helper functions or table-driven lookup mappings.',
    });
  }

  // Finding 5: Isolated / Leaf Modules
  const orphanNodes = nodes.filter(
    (n) => n.fanIn === 0 && n.fanOut === 0 && n.fileRole === 'source' && !n.name.includes('config')
  );
  if (orphanNodes.length > 0) {
    findings.push({
      id: 'finding_orphans',
      title: `${orphanNodes.length} Isolated Source Module${orphanNodes.length > 1 ? 's' : ''}`,
      category: 'dead_code',
      severity: 'info',
      affectedFiles: orphanNodes.slice(0, 5).map((n) => n.id),
      evidence: `Files like ${orphanNodes[0].name} have 0 local incoming and 0 outgoing dependencies.`,
      impact:
        'May indicate standalone scripts, unused legacy code, or entry points not wired to the main dependency tree.',
      recommendation:
        'Inspect whether these files are intended as CLI tools, standalone utilities, or candidates for deprecation.',
    });
  }

  return findings;
}

function generateOnboardingPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  files: Record<string, IndexedFile>
): OnboardingStep[] {
  const steps: OnboardingStep[] = [];
  const addedFiles = new Set<string>();

  // Helper to add
  function addStep(fileId: string, role: string, reason: string) {
    if (addedFiles.has(fileId)) return;
    const file = files[fileId];
    if (!file) return;

    addedFiles.add(fileId);
    const deps = edges.filter((e) => e.source === fileId).map((e) => e.target);
    const dependents = edges.filter((e) => e.target === fileId).map((e) => e.source);

    const keySymbols = file.exports.length > 0
      ? file.exports.map((x) => x.name).slice(0, 5)
      : file.declarations.map((d) => d.name).slice(0, 5);

    steps.push({
      rank: steps.length + 1,
      fileId,
      filePath: file.path,
      fileName: file.name,
      role,
      reason,
      keySymbols,
      dependencies: deps,
      dependents,
    });
  }

  // Step 1: Documentation / Orientation
  const readme = nodes.find((n) => n.name.toLowerCase() === 'readme.md');
  if (readme) {
    addStep(readme.id, 'Repository Guide & Overview', 'Primary documentation explaining project goals, installation, and usage.');
  }

  // Step 2: Main Application Entry Point
  const entries = nodes
    .filter((n) => n.fileRole === 'entry')
    .sort((a, b) => b.fanOut - a.fanOut);

  if (entries.length > 0) {
    const topEntry = entries[0];
    addStep(
      topEntry.id,
      'Application Bootstrap & Entry',
      `Central entry point initializing execution runtime and registering core routes/subsystems (fan-out: ${topEntry.fanOut}).`
    );
  }

  // Step 3: Core Domain Models / Type Schemas
  const typeFiles = nodes
    .filter((n) => n.fileRole === 'type' || n.name.includes('type') || n.name.includes('schema') || n.name.includes('model'))
    .sort((a, b) => b.fanIn - a.fanIn);

  if (typeFiles.length > 0) {
    const topType = typeFiles[0];
    addStep(
      topType.id,
      'Domain Model & Type Contracts',
      `Establishes structural schemas and interfaces used across ${topType.fanIn} modules in the system.`
    );
  }

  // Step 4: Foundation Service / High Fan-In Core
  const coreServices = nodes
    .filter((n) => !addedFiles.has(n.id) && n.fanIn >= 2 && n.fileRole !== 'doc')
    .sort((a, b) => b.fanIn - a.fanIn);

  if (coreServices.length > 0) {
    const topCore = coreServices[0];
    addStep(
      topCore.id,
      'Core Shared Foundation',
      `Crucial utility or foundational logic imported by ${topCore.fanIn} distinct modules. Understanding this unlocks other files.`
    );
  }

  // Step 5: Primary Router or Orchestrator
  const orchestrators = nodes
    .filter((n) => !addedFiles.has(n.id) && n.fanOut >= 3)
    .sort((a, b) => b.fanOut - a.fanOut);

  if (orchestrators.length > 0) {
    const topOrch = orchestrators[0];
    addStep(
      topOrch.id,
      'Workflow / Orchestration Layer',
      `Coordinates interactions between ${topOrch.fanOut} local services and modules.`
    );
  }

  // Step 6: Representative Feature Module
  const remaining = nodes
    .filter((n) => !addedFiles.has(n.id) && n.fileRole === 'source' && (n.fanIn > 0 || n.fanOut > 0))
    .sort((a, b) => b.lineCount - a.lineCount);

  if (remaining.length > 0) {
    const sample = remaining[0];
    addStep(
      sample.id,
      'Feature Implementation',
      `Concrete business logic file (${sample.lineCount} lines) illustrating real-world code conventions and error handling.`
    );
  }

  // Step 7: Configuration or Test Foundation
  const testOrConfig = nodes.find(
    (n) => !addedFiles.has(n.id) && (n.fileRole === 'config' || n.fileRole === 'test')
  );
  if (testOrConfig) {
    addStep(
      testOrConfig.id,
      testOrConfig.fileRole === 'test' ? 'Test Harness' : 'Project Configuration',
      testOrConfig.fileRole === 'test'
        ? 'Demonstrates testing patterns and assertion expectations.'
        : 'Defines build targets, dependencies, and environment assumptions.'
    );
  }

  return steps;
}
