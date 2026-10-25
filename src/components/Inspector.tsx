import React, { useState, useEffect } from 'react';
import {
  FileText,
  Code2,
  Activity,
  Compass,
  Sparkles,
  Layers,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  Send,
  Loader2,
  FileCode,
  Box,
} from 'lucide-react';
import { AnalysisResult, IndexedFileMeta } from '../types';

interface InspectorProps {
  analysis: AnalysisResult | null;
  selectedFileId: string | null;
  onSelectNode: (id: string) => void;
  analysisId: string | null;
}

type TabType = 'source' | 'dependencies' | 'overview' | 'health' | 'onboarding' | 'oracle';

export function Inspector({
  analysis,
  selectedFileId,
  onSelectNode,
  analysisId,
}: InspectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('source');

  // File source content state
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Oracle (Gemini assistant) state
  const [oracleQuestion, setOracleQuestion] = useState('');
  const [oracleAnswer, setOracleAnswer] = useState<string | null>(null);
  const [oracleEvidence, setOracleEvidence] = useState<string[]>([]);
  const [isOracleLoading, setIsOracleLoading] = useState(false);
  const [oracleError, setOracleError] = useState<string | null>(null);
  const [isAiPowered, setIsAiPowered] = useState(false);

  // Copy code feedback
  const [isCopied, setIsCopied] = useState(false);

  // Fetch real file content when selectedFileId or analysisId changes
  useEffect(() => {
    if (!analysisId || !selectedFileId) {
      setFileContent('');
      return;
    }

    let isMounted = true;
    setIsLoadingFile(true);
    setFileError(null);

    fetch(`/api/analysis/${analysisId}/file?path=${encodeURIComponent(selectedFileId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to load file (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setFileContent(data.content || '');
          setIsLoadingFile(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setFileError(err.message);
          setIsLoadingFile(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [analysisId, selectedFileId]);

  // Handle Oracle Question Submit
  const handleAskOracle = async (questionText: string) => {
    if (!analysisId || !questionText.trim() || isOracleLoading) return;

    setIsOracleLoading(true);
    setOracleError(null);
    setOracleAnswer(null);

    try {
      const res = await fetch(`/api/analysis/${analysisId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          selectedFileId: selectedFileId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to get answer.');
      }

      const data = await res.json();
      setOracleAnswer(data.answer);
      setOracleEvidence(data.evidence || []);
      setIsAiPowered(data.isAiPowered);
    } catch (err: any) {
      setOracleError(err.message || 'Error processing question.');
    } finally {
      setIsOracleLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!analysis) {
    return (
      <aside className="w-96 bg-[#0e1015] border-l border-[#242833] flex flex-col p-5 text-xs text-[#6e7687]">
        <div className="font-serif-atlas text-[#a7afbf] font-medium tracking-wider mb-2">
          Architectural Inspector
        </div>
        <p className="leading-relaxed">
          Select any node in the dependency atlas to inspect real source code, declarations, fan-in/fan-out metrics, and blast radius.
        </p>
      </aside>
    );
  }

  const selectedNode = selectedFileId
    ? analysis.nodes.find((n) => n.id === selectedFileId)
    : null;
  const selectedMeta: IndexedFileMeta | undefined = selectedFileId
    ? analysis.filesIndex[selectedFileId]
    : undefined;

  // Dependencies of selected file (files it imports)
  const outgoingDeps = selectedFileId
    ? analysis.edges.filter((e) => e.source === selectedFileId)
    : [];

  // Dependents of selected file (files that import it)
  const incomingDeps = selectedFileId
    ? analysis.edges.filter((e) => e.target === selectedFileId)
    : [];

  return (
    <aside className="w-[410px] bg-[#0e1015] border-l border-[#242833] flex flex-col shrink-0 select-none overflow-hidden">
      {/* Tab Navigation */}
      <div className="h-10 bg-[#12141a] border-b border-[#202533] flex items-center px-1 overflow-x-auto scrollbar-none gap-0.5">
        {[
          { key: 'source', label: 'Source', icon: Code2 },
          { key: 'dependencies', label: 'Deps', icon: Layers },
          { key: 'health', label: 'Health', icon: Activity, badge: analysis.cycles.length > 0 ? analysis.cycles.length : undefined },
          { key: 'onboarding', label: 'Onboard', icon: Compass },
          { key: 'overview', label: 'Overview', icon: FileText },
          { key: 'oracle', label: 'Oracle', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`h-7 px-2.5 rounded flex items-center gap-1.5 text-xs font-mono transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#1e2330] text-[#f4efe6] font-semibold border-b-2 border-[#c5a059]'
                  : 'text-[#858c9c] hover:text-[#ded9cd] hover:bg-[#161922]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[9px] px-1 rounded-full bg-[#8b263e] text-white font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected File Header Ribbon */}
      <div className="p-3 bg-[#111319] border-b border-[#1f2430] flex items-center justify-between gap-2">
        <div className="flex flex-col truncate">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-[#f4efe6] truncate">
              {selectedFileId ? selectedFileId.split('/').pop() : 'No file selected'}
            </span>
            {selectedNode && (
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1e2330] text-[#c5a059] font-mono uppercase">
                {selectedNode.language}
              </span>
            )}
          </div>
          <span className="text-[10px] text-[#71798b] font-mono truncate">
            {selectedFileId || 'Click any node in graph or file in explorer'}
          </span>
        </div>

        {selectedFileId && activeTab === 'source' && (
          <button
            onClick={copyToClipboard}
            title="Copy Source Code"
            className="p-1.5 hover:bg-[#1b202c] text-[#8e95a5] hover:text-[#f4efe6] rounded border border-[#252b39] transition-colors shrink-0"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-3 text-xs">
        {/* --- TAB 1: SOURCE --- */}
        {activeTab === 'source' && (
          <div className="flex flex-col gap-3 font-mono">
            {!selectedFileId ? (
              <div className="p-8 text-center text-[#6e7687] italic">
                Select a file from the explorer or atlas graph to view its real retrieved source code.
              </div>
            ) : isLoadingFile ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2 text-[#8e95a5]">
                <Loader2 className="w-5 h-5 animate-spin text-[#c5a059]" />
                <span className="text-[11px]">Loading source excerpt...</span>
              </div>
            ) : fileError ? (
              <div className="p-4 bg-[#231217] border border-[#521b27] rounded text-[#e08295] text-[11px]">
                {fileError}
              </div>
            ) : (
              <>
                {/* File Statistics Strip */}
                {selectedNode && (
                  <div className="grid grid-cols-4 gap-1 p-2 bg-[#12151c] border border-[#202533] rounded text-[10px] text-[#a5abb7]">
                    <div>
                      <div className="text-[#646c7d]">Lines</div>
                      <div className="font-semibold text-[#f4efe6] tabular-nums">{selectedNode.lineCount}</div>
                    </div>
                    <div>
                      <div className="text-[#646c7d]">Complexity</div>
                      <div className="font-semibold text-[#f4efe6] tabular-nums">{selectedNode.complexity}</div>
                    </div>
                    <div>
                      <div className="text-[#646c7d]">Fan-In</div>
                      <div className="font-semibold text-[#4a90e2] tabular-nums">{selectedNode.fanIn}</div>
                    </div>
                    <div>
                      <div className="text-[#646c7d]">Fan-Out</div>
                      <div className="font-semibold text-[#c5a059] tabular-nums">{selectedNode.fanOut}</div>
                    </div>
                  </div>
                )}

                {/* Extracted Declarations summary if present */}
                {selectedMeta && (selectedMeta.declarations.length > 0 || selectedMeta.exports.length > 0) && (
                  <div className="p-2 bg-[#12151c] border border-[#202533] rounded flex flex-col gap-1 text-[11px]">
                    <div className="text-[#8e95a5] text-[10px] uppercase tracking-wider font-semibold">
                      Extracted Symbols ({selectedMeta.declarations.length + selectedMeta.exports.length})
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {selectedMeta.exports.map((exp, idx) => (
                        <span
                          key={`exp-${idx}`}
                          className="px-1.5 py-0.5 rounded bg-[#1e2535] text-[#7eb3ff] text-[10px]"
                        >
                          export {exp.name}
                        </span>
                      ))}
                      {selectedMeta.declarations.map((decl, idx) => (
                        <span
                          key={`decl-${idx}`}
                          className="px-1.5 py-0.5 rounded bg-[#181c25] text-[#b8bfcc] text-[10px]"
                        >
                          {decl.kind} {decl.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source Viewer with line numbers */}
                <div className="bg-[#090a0d] border border-[#1e2330] rounded p-2.5 overflow-x-auto text-[11px] leading-relaxed max-h-[500px]">
                  <table className="w-full border-collapse">
                    <tbody>
                      {fileContent.split('\n').map((line, idx) => (
                        <tr key={idx} className="hover:bg-[#12151e]/80">
                          <td className="pr-3 text-right text-[#484f60] select-none align-top w-8 text-[10px] tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="text-[#d8d3c5] whitespace-pre font-mono">
                            {line || ' '}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* --- TAB 2: DEPENDENCIES --- */}
        {activeTab === 'dependencies' && (
          <div className="flex flex-col gap-4 font-mono">
            {!selectedFileId ? (
              <div className="p-8 text-center text-[#6e7687] italic">
                Select a file to inspect its outgoing dependencies and incoming consumers.
              </div>
            ) : (
              <>
                {/* Outgoing Dependencies (Fan-Out) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#c5a059] font-semibold text-xs flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Outgoing Dependencies ({outgoingDeps.length})</span>
                    </span>
                    <span className="text-[10px] text-[#6c7485]">Files imported by this module</span>
                  </div>

                  {outgoingDeps.length === 0 ? (
                    <div className="p-3 bg-[#111319] border border-[#1f2430] rounded text-[#6c7485] text-[11px] italic">
                      No local outgoing dependencies (leaf module).
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {outgoingDeps.map((dep) => (
                        <button
                          key={dep.id}
                          onClick={() => onSelectNode(dep.target)}
                          className="p-2 bg-[#12151c] hover:bg-[#1b202c] border border-[#202533] rounded text-left transition-colors flex items-center justify-between group"
                        >
                          <div className="flex flex-col truncate">
                            <span className="text-[#f4efe6] font-medium truncate text-[11px]">
                              {dep.target.split('/').pop()}
                            </span>
                            <span className="text-[#646c7d] text-[10px] truncate">{dep.target}</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-[#6c7485] group-hover:text-[#c5a059] shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Incoming Dependents (Fan-In) */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#1d222e]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#4a90e2] font-semibold text-xs flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5" />
                      <span>Incoming Dependents ({incomingDeps.length})</span>
                    </span>
                    <span className="text-[10px] text-[#6c7485]">Modules importing this file</span>
                  </div>

                  {incomingDeps.length === 0 ? (
                    <div className="p-3 bg-[#111319] border border-[#1f2430] rounded text-[#6c7485] text-[11px] italic">
                      No other local modules import this file directly.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {incomingDeps.map((dep) => (
                        <button
                          key={dep.id}
                          onClick={() => onSelectNode(dep.source)}
                          className="p-2 bg-[#12151c] hover:bg-[#1b202c] border border-[#202533] rounded text-left transition-colors flex items-center justify-between group"
                        >
                          <div className="flex flex-col truncate">
                            <span className="text-[#f4efe6] font-medium truncate text-[11px]">
                              {dep.source.split('/').pop()}
                            </span>
                            <span className="text-[#646c7d] text-[10px] truncate">{dep.source}</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-[#6c7485] group-hover:text-[#4a90e2] shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* External Imports if any */}
                {selectedMeta && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-[#1d222e]">
                    <div className="text-[10px] text-[#6c7485] uppercase tracking-wider font-semibold">
                      External Package Imports
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedMeta.imports
                        .filter((i) => i.isExternal)
                        .map((imp, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-[#181a22] border border-[#232733] text-[#a5abb7] text-[10px]"
                          >
                            {imp.source}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* --- TAB 3: HEALTH & CYCLES --- */}
        {activeTab === 'health' && (
          <div className="flex flex-col gap-3 font-mono">
            {/* Circular Dependencies Section */}
            <div className="p-3 bg-[#171216] border border-[#4a1c27] rounded flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#e55370] text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#c5304b]" />
                  <span>Circular Dependencies ({analysis.cycles.length})</span>
                </span>
                <span className="text-[10px] text-[#8e95a5]">Cycle Detection Engine</span>
              </div>

              {analysis.cycles.length === 0 ? (
                <div className="text-[11px] text-[#6dbb8b]">
                  ✅ No circular dependency loops detected. Architecture is an acyclic directed graph.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-[#c9b4ba] leading-relaxed">
                    Detected {analysis.cycles.length} circular loop(s). Click any cycle below to inspect and highlight affected files:
                  </p>
                  {analysis.cycles.map((cycle, idx) => (
                    <div
                      key={cycle.id}
                      className="p-2 bg-[#21141a] border border-[#521b27] rounded flex flex-col gap-1.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#f4efe6]">
                          Loop #{idx + 1} ({cycle.length} files)
                        </span>
                        <span className="text-[9px] uppercase px-1 rounded bg-[#8b263e] text-white">
                          {cycle.severity}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 text-[10px] text-[#e0a8b4]">
                        {cycle.files.map((f, fIdx) => (
                          <React.Fragment key={fIdx}>
                            <button
                              onClick={() => onSelectNode(f)}
                              className="underline hover:text-white"
                            >
                              {f.split('/').pop()}
                            </button>
                            {fIdx < cycle.files.length - 1 && <span>➔</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Architectural Findings List */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#1e2330]">
              <div className="font-serif-atlas text-xs font-semibold text-[#f4efe6]">
                Architectural Findings ({analysis.findings.length})
              </div>

              {analysis.findings.map((f) => (
                <div
                  key={f.id}
                  className="p-3 bg-[#12151c] border border-[#202533] rounded flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#f4efe6] text-[11px]">{f.title}</span>
                    <span
                      className={`text-[9px] uppercase px-1 rounded font-bold ${
                        f.severity === 'high'
                          ? 'bg-[#8b263e] text-white'
                          : f.severity === 'medium'
                          ? 'bg-[#c5a059] text-black'
                          : 'bg-[#252b39] text-[#9ca3af]'
                      }`}
                    >
                      {f.severity}
                    </span>
                  </div>

                  <p className="text-[10px] text-[#c5c1b6] leading-relaxed font-sans">{f.impact}</p>

                  <div className="text-[10px] text-[#c5a059] bg-[#1a1c22] p-1.5 rounded border border-[#2a2d37]">
                    <strong>Recommendation:</strong> {f.recommendation}
                  </div>

                  {f.affectedFiles.length > 0 && (
                    <div className="flex items-center gap-1 overflow-x-auto text-[9px] text-[#8e95a5] pt-1">
                      <span>Files:</span>
                      {f.affectedFiles.slice(0, 3).map((fileId) => (
                        <button
                          key={fileId}
                          onClick={() => onSelectNode(fileId)}
                          className="underline hover:text-[#f4efe6]"
                        >
                          {fileId.split('/').pop()}
                        </button>
                      ))}
                      {f.affectedFiles.length > 3 && <span>+{f.affectedFiles.length - 3} more</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 4: ONBOARDING --- */}
        {activeTab === 'onboarding' && (
          <div className="flex flex-col gap-3 font-mono">
            <div className="p-3 bg-[#12151c] border border-[#202533] rounded flex flex-col gap-1 text-[11px]">
              <div className="font-serif-atlas font-semibold text-xs text-[#c5a059]">
                Guided Codebase Onboarding Pathfinder
              </div>
              <p className="text-[10px] text-[#9ba2b3] leading-relaxed font-sans">
                A deterministic, evidence-based reading curriculum designed to rapidly build mental models for new engineers.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {analysis.onboardingPath.map((step) => {
                const isCurrent = selectedFileId === step.fileId;
                return (
                  <div
                    key={step.rank}
                    className={`p-3 rounded border transition-all flex flex-col gap-1.5 ${
                      isCurrent
                        ? 'bg-[#181d28] border-[#c5a059]'
                        : 'bg-[#12141a] border-[#222733] hover:border-[#32394a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#c5a059] text-[#0d0f14] font-bold text-[10px] flex items-center justify-center">
                          {step.rank}
                        </span>
                        <span className="font-semibold text-[#f4efe6] text-[11px]">
                          {step.fileName}
                        </span>
                      </div>
                      <button
                        onClick={() => onSelectNode(step.fileId)}
                        className="text-[10px] text-[#c5a059] hover:text-[#f4efe6] underline flex items-center gap-0.5"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-[10px] text-[#8e95a5] font-semibold">{step.role}</div>

                    <p className="text-[10px] text-[#c0b9a8] leading-relaxed font-sans">
                      {step.reason}
                    </p>

                    {step.keySymbols.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {step.keySymbols.map((sym, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[9px] px-1 py-0.2 bg-[#1b202c] text-[#7eb3ff] rounded"
                          >
                            {sym}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TAB 5: OVERVIEW --- */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-3 font-mono">
            {/* Repository Info Card */}
            <div className="p-3 bg-[#12151c] border border-[#202533] rounded flex flex-col gap-1.5">
              <span className="font-serif-atlas text-xs font-semibold text-[#f4efe6]">
                {analysis.repo.fullName}
              </span>
              <p className="text-[10px] text-[#8e95a5] leading-relaxed font-sans">
                {analysis.repo.description}
              </p>
              {analysis.repo.sourceUrl && (
                <a
                  href={analysis.repo.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-[#c5a059] hover:underline flex items-center gap-1 pt-1"
                >
                  <span>Open in GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Calculated Statistics Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 bg-[#12141a] border border-[#202533] rounded">
                <div className="text-[10px] text-[#6c7485]">Indexed Files</div>
                <div className="text-sm font-semibold text-[#f4efe6] tabular-nums">
                  {analysis.metrics.analyzedFiles}
                </div>
              </div>
              <div className="p-2.5 bg-[#12141a] border border-[#202533] rounded">
                <div className="text-[10px] text-[#6c7485]">Resolved Edges</div>
                <div className="text-sm font-semibold text-[#c5a059] tabular-nums">
                  {analysis.metrics.resolvedEdgesCount}
                </div>
              </div>
              <div className="p-2.5 bg-[#12141a] border border-[#202533] rounded">
                <div className="text-[10px] text-[#6c7485]">Lines of Code</div>
                <div className="text-sm font-semibold text-[#f4efe6] tabular-nums">
                  {analysis.metrics.totalLines}
                </div>
              </div>
              <div className="p-2.5 bg-[#12141a] border border-[#202533] rounded">
                <div className="text-[10px] text-[#6c7485]">Analysis Time</div>
                <div className="text-sm font-semibold text-[#f4efe6] tabular-nums">
                  {analysis.metrics.analysisDurationMs}ms
                </div>
              </div>
            </div>

            {/* Top Coupling Hubs */}
            <div className="p-3 bg-[#12141a] border border-[#202533] rounded flex flex-col gap-2">
              <span className="font-semibold text-xs text-[#f4efe6]">Top Coupling Hub</span>
              <div className="text-[11px] text-[#ded9cd]">
                Highest Fan-In: <strong className="text-[#4a90e2]">{analysis.metrics.maxFanIn.file}</strong> ({analysis.metrics.maxFanIn.count} imports)
              </div>
              <div className="text-[11px] text-[#ded9cd]">
                Highest Fan-Out: <strong className="text-[#c5a059]">{analysis.metrics.maxFanOut.file}</strong> ({analysis.metrics.maxFanOut.count} dependencies)
              </div>
            </div>

            {/* Language Distribution */}
            <div className="p-3 bg-[#12141a] border border-[#202533] rounded flex flex-col gap-2">
              <span className="font-semibold text-xs text-[#f4efe6]">Language Distribution</span>
              <div className="flex flex-col gap-1 text-[11px]">
                {Object.entries(analysis.metrics.languageDistribution).map(([lang, count]) => (
                  <div key={lang} className="flex items-center justify-between text-[10px]">
                    <span className="text-[#8e95a5] capitalize">{lang}</span>
                    <span className="text-[#f4efe6] font-semibold tabular-nums">{count} file(s)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 6: ORACLE (GEMINI ASSISTANT) --- */}
        {activeTab === 'oracle' && (
          <div className="flex flex-col gap-3 font-mono">
            <div className="p-3 bg-[#14121a] border border-[#3b2d52] rounded flex flex-col gap-1 text-[11px]">
              <div className="flex items-center gap-1.5 font-serif-atlas text-xs font-semibold text-[#c7a4ff]">
                <Sparkles className="w-3.5 h-3.5 text-[#b388ff]" />
                <span>Astral Oracle (Codebase Intelligence)</span>
              </div>
              <p className="text-[10px] text-[#a49bb5] font-sans leading-relaxed">
                Asks questions grounded directly in the parsed architectural graph, cycles, and real source excerpts.
              </p>
            </div>

            {/* Quick Prompt Starters */}
            <div className="flex flex-col gap-1">
              <div className="text-[10px] text-[#6c7485] uppercase tracking-wider font-semibold">
                Quick Architectural Queries
              </div>
              {[
                'Where does application execution begin?',
                'What are the circular dependencies in this repo?',
                selectedFileId
                  ? `What are the risks of modifying ${selectedFileId.split('/').pop()}?`
                  : 'Which files should I study first?',
              ].map((query, qIdx) => (
                <button
                  key={qIdx}
                  onClick={() => {
                    setOracleQuestion(query);
                    handleAskOracle(query);
                  }}
                  className="p-1.5 bg-[#12141a] hover:bg-[#1b1f2b] border border-[#212634] rounded text-left text-[10px] text-[#b4bac8] hover:text-[#f4efe6] transition-colors"
                >
                  "{query}"
                </button>
              ))}
            </div>

            {/* Input Question Area */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <textarea
                  value={oracleQuestion}
                  onChange={(e) => setOracleQuestion(e.target.value)}
                  placeholder="Ask any architectural question about this codebase..."
                  rows={3}
                  className="w-full p-2 bg-[#0c0e13] border border-[#222733] rounded text-xs text-[#ded9cd] placeholder-[#5c6374] focus:border-[#c5a059] focus:outline-none resize-none font-mono"
                />
              </div>
              <button
                onClick={() => handleAskOracle(oracleQuestion)}
                disabled={isOracleLoading || !oracleQuestion.trim()}
                className="h-7 px-3 bg-[#8b263e] hover:bg-[#a12f4b] disabled:bg-[#341b23] disabled:text-[#7d5660] text-white text-xs font-medium rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                {isOracleLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Consulting Oracle...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Question</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>

            {/* Answer Display */}
            {oracleError && (
              <div className="p-3 bg-[#241318] border border-[#521b27] rounded text-[#e08295] text-[11px]">
                {oracleError}
              </div>
            )}

            {oracleAnswer && (
              <div className="p-3 bg-[#111319] border border-[#252b39] rounded flex flex-col gap-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#1f2430]">
                  <span className="text-[10px] text-[#8e95a5] uppercase font-semibold">
                    {isAiPowered ? '✨ Gemini Grounded Response' : '⚡ Architectural Index Response'}
                  </span>
                </div>
                <div className="text-[11px] text-[#ded9cd] leading-relaxed whitespace-pre-wrap font-sans">
                  {oracleAnswer}
                </div>

                {oracleEvidence.length > 0 && (
                  <div className="pt-2 border-t border-[#1e2330] flex flex-wrap items-center gap-1 text-[10px]">
                    <span className="text-[#6c7485]">Evidence Files:</span>
                    {oracleEvidence.map((evFile) => (
                      <button
                        key={evFile}
                        onClick={() => onSelectNode(evFile)}
                        className="text-[#c5a059] hover:underline"
                      >
                        {evFile.split('/').pop()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
