import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { RepoExplorer } from './components/RepoExplorer';
import { AtlasGraph } from './components/AtlasGraph';
import { Inspector } from './components/Inspector';
import { EmptyState } from './components/EmptyState';
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { AnalysisResult } from './types';

export function App() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSubmittedUrl, setLastSubmittedUrl] = useState('');

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Load a demo showcase by key (e.g. 'astral-cartographer' or 'chrono-vault')
  const loadSample = async (key: string) => {
    setIsLoading(true);
    setLoadingStage('Initializing architectural showcase...');
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/samples/${key}`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load showcase repository.');
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setAnalysisId(data.analysisId);
      // Select the primary entry point or first file
      const entryNode = data.analysis.nodes.find((n: any) => n.fileRole === 'entry') || data.analysis.nodes[0];
      if (entryNode) {
        setSelectedFileId(entryNode.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading showcase.');
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze a real GitHub repository
  const handleAnalyzeGithub = async (repoUrl: string) => {
    setLastSubmittedUrl(repoUrl);
    setIsLoading(true);
    setLoadingStage('Connecting to GitHub API...');
    setErrorMessage(null);

    try {
      setLoadingStage('Inspecting repository tree & filtering source files...');
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, maxFiles: 75 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `GitHub analysis failed (${res.status})`);
      }

      setLoadingStage('Compiling AST dependency graph & detecting cycles...');
      const data = await res.json();
      setAnalysis(data.analysis);
      setAnalysisId(data.analysisId);

      // Select top entry point or highest fan-in hub
      const entryNode =
        data.analysis.nodes.find((n: any) => n.fileRole === 'entry') ||
        data.analysis.nodes.slice().sort((a: any, b: any) => b.fanIn - a.fanIn)[0] ||
        data.analysis.nodes[0];

      if (entryNode) {
        setSelectedFileId(entryNode.id);
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'Failed to analyze repository.');
    } finally {
      setIsLoading(false);
    }
  };

  // Analyze an uploaded ZIP archive
  const handleUploadZip = async (name: string, base64: string) => {
    setIsLoading(true);
    setLoadingStage('Inspecting uploaded ZIP archive in memory...');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/analyze/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, base64 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to inspect ZIP archive.');
      }

      setLoadingStage('Building AST graph & architectural metrics...');
      const data = await res.json();
      setAnalysis(data.analysis);
      setAnalysisId(data.analysisId);

      const entryNode =
        data.analysis.nodes.find((n: any) => n.fileRole === 'entry') ||
        data.analysis.nodes[0];
      if (entryNode) {
        setSelectedFileId(entryNode.id);
      }
    } catch (err: any) {
      console.error('ZIP upload error:', err);
      setErrorMessage(err.message || 'Failed to inspect ZIP archive.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load: start with Astral Cartographer Self-Map so the atlas is immediately alive
  useEffect(() => {
    loadSample('astral-cartographer');
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0b0e] text-[#ded9cd]">
      {/* Top Navigation Bar */}
      <TopBar
        analysis={analysis}
        isLoading={isLoading}
        loadingStage={loadingStage}
        onAnalyze={handleAnalyzeGithub}
        onUploadZip={handleUploadZip}
        onLoadSample={loadSample}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Workspace Dashboard */}
      <div className="flex flex-1 overflow-hidden relative">
        {analysis ? (
          <>
            {/* Left Sidebar: Repository Explorer */}
            <RepoExplorer
              analysis={analysis}
              selectedFileId={selectedFileId}
              onSelectFile={(id) => setSelectedFileId(id)}
            />

            {/* Center: Interactive Dependency Atlas Graph */}
            <AtlasGraph
              analysis={analysis}
              selectedNodeId={selectedFileId}
              onNodeSelect={(id) => setSelectedFileId(id)}
            />

            {/* Right Sidebar: Deep Architectural Inspector */}
            <Inspector
              analysis={analysis}
              selectedFileId={selectedFileId}
              onSelectNode={(id) => setSelectedFileId(id)}
              analysisId={analysisId}
            />
          </>
        ) : (
          <EmptyState
            isLoading={isLoading}
            loadingStage={loadingStage}
            errorMessage={errorMessage}
            onSelectSample={loadSample}
            onRetry={() => {
              if (lastSubmittedUrl) handleAnalyzeGithub(lastSubmittedUrl);
              else loadSample('astral-cartographer');
            }}
            onOpenZip={() => {
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              fileInput?.click();
            }}
          />
        )}
      </div>

      {/* Export Modal */}
      {isExportOpen && analysis && (
        <ExportModal
          analysis={analysis}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {/* Help & Methodology Modal */}
      {isHelpOpen && (
        <HelpModal onClose={() => setIsHelpOpen(false)} />
      )}
    </div>
  );
}

export default App;
