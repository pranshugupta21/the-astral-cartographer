import React from 'react';
import { Compass, Sparkles, ArrowRight, Upload, AlertCircle, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  isLoading: boolean;
  loadingStage: string;
  errorMessage: string | null;
  onSelectSample: (key: string) => void;
  onRetry: () => void;
  onOpenZip: () => void;
}

export function EmptyState({
  isLoading,
  loadingStage,
  errorMessage,
  onSelectSample,
  onRetry,
  onOpenZip,
}: EmptyStateProps) {
  if (isLoading) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-6 bg-[#0a0b0e] carto-dots">
        <div className="max-w-md w-full p-8 bg-[#111319] border border-[#252b39] rounded shadow-2xl flex flex-col items-center text-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border border-[#c5a059]/30 bg-[#161a24] flex items-center justify-center text-[#c5a059]">
              <Compass className="w-8 h-8 animate-[spin_10s_linear_infinite]" />
            </div>
            <div className="absolute inset-0 rounded-full border border-[#8b263e]/40 animate-ping opacity-30" />
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="font-serif-atlas text-base font-semibold text-[#f4efe6]">
              Surveying Codebase Architecture
            </h3>
            <p className="text-xs text-[#a0a8b8] font-mono">{loadingStage}</p>
          </div>

          {/* Progress indicator stages */}
          <div className="w-full flex flex-col gap-1.5 pt-3 border-t border-[#1e2330] text-[11px] font-mono text-left">
            {[
              'Verifying repository endpoint and branch',
              'Retrieving file tree and filtering binary artifacts',
              'Running syntax-aware AST parsing (TypeScript/Python)',
              'Resolving dependency graph and detecting cycles',
              'Calculating fan-in/fan-out and onboarding path',
            ].map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[#767e91]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-6 bg-[#0a0b0e] carto-grid">
        <div className="max-w-md w-full p-6 bg-[#161114] border border-[#521b27] rounded shadow-2xl flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#271217] border border-[#782234] flex items-center justify-center text-[#e55370]">
            <AlertCircle className="w-6 h-6" />
          </div>

          <h3 className="font-serif-atlas text-sm font-semibold text-[#f4efe6]">
            Architectural Survey Interrupted
          </h3>

          <p className="text-xs text-[#d1b8be] font-mono leading-relaxed bg-[#201318] p-3 rounded border border-[#3b1720] text-left">
            {errorMessage}
          </p>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onRetry}
              className="px-3.5 py-1.5 bg-[#8b263e] hover:bg-[#a12f4b] text-white text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
            <button
              onClick={onOpenZip}
              className="px-3.5 py-1.5 bg-[#1a1d26] hover:bg-[#252a38] text-[#c9c3b6] text-xs font-medium rounded flex items-center gap-1.5 border border-[#2a303e] transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>Upload ZIP Archive</span>
            </button>
          </div>

          <div className="text-[11px] text-[#8e95a5] pt-1">
            Or load an instant offline demo showcase below.
          </div>

          <div className="w-full flex gap-2 pt-1">
            <button
              onClick={() => onSelectSample('astral-cartographer')}
              className="flex-1 p-2 bg-[#1b1f2b] hover:bg-[#222736] border border-[#2c3344] rounded text-[11px] text-[#f4efe6] font-mono text-center"
            >
              Astral Self-Map
            </button>
            <button
              onClick={() => onSelectSample('chrono-vault')}
              className="flex-1 p-2 bg-[#1b1f2b] hover:bg-[#222736] border border-[#2c3344] rounded text-[11px] text-[#f4efe6] font-mono text-center"
            >
              Chrono-Vault (Cycles)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-6 bg-[#0a0b0e] carto-grid select-none">
      <div className="max-w-xl w-full p-8 bg-[#111319]/90 backdrop-blur border border-[#242936] rounded shadow-2xl flex flex-col items-center text-center gap-5">
        {/* Astrolabe Crest */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-[#c5a059]/40 bg-[#161922] flex items-center justify-center text-[#c5a059] shadow-lg">
            <Compass className="w-8 h-8 animate-[spin_60s_linear_infinite]" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="font-serif-atlas text-xl font-bold tracking-wide text-[#f4efe6]">
            The Astral Cartographer
          </h2>
          <p className="text-xs text-[#a5abb7] font-sans max-w-md leading-relaxed">
            Transform GitHub repositories into navigable architectural maps. Inspect AST dependency graphs, detect circular loops, analyze blast radii, and explore guided developer onboarding paths.
          </p>
        </div>

        {/* Demo Showcase Cards */}
        <div className="w-full flex flex-col gap-2 pt-2 border-t border-[#1d222e]">
          <div className="text-[11px] text-[#8e95a5] uppercase tracking-wider font-semibold">
            One-Click Showcase Repositories
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            <button
              onClick={() => onSelectSample('astral-cartographer')}
              className="p-3 bg-[#141720] hover:bg-[#1a1f2b] border border-[#262c3b] hover:border-[#c5a059]/50 rounded transition-all group flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#f4efe6] group-hover:text-[#c5a059]">
                  Astral Self-Map
                </span>
                <span className="text-[10px] text-[#c5a059] font-mono">17 files</span>
              </div>
              <span className="text-[11px] text-[#7d8697] leading-tight">
                Architectural self-reflection of this app: server, AST parser, and UI components.
              </span>
            </button>

            <button
              onClick={() => onSelectSample('chrono-vault')}
              className="p-3 bg-[#141720] hover:bg-[#1a1f2b] border border-[#262c3b] hover:border-[#8b263e]/60 rounded transition-all group flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#f4efe6] group-hover:text-[#e05370]">
                  Chrono-Vault Service
                </span>
                <span className="text-[10px] text-[#e05370] font-mono">Cycles</span>
              </div>
              <span className="text-[11px] text-[#7d8697] leading-tight">
                Distributed ledger service with real circular dependencies between auth & session.
              </span>
            </button>
          </div>
        </div>

        {/* Quick Instructions */}
        <div className="text-[11px] text-[#6d7588] font-mono">
          Enter any public GitHub repository URL above (e.g.{' '}
          <code className="text-[#a5abb7]">facebook/react</code> or{' '}
          <code className="text-[#a5abb7]">expressjs/express</code>) or upload a ZIP archive.
        </div>
      </div>
    </div>
  );
}
