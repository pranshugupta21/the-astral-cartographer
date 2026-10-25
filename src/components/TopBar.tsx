import React, { useState, useRef } from 'react';
import { Compass, GitBranch, ArrowRight, Upload, Sparkles, Download, HelpCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { AnalysisResult, RepoMetadata } from '../types';

interface TopBarProps {
  analysis: AnalysisResult | null;
  isLoading: boolean;
  loadingStage: string;
  onAnalyze: (url: string) => void;
  onUploadZip: (name: string, base64: string) => void;
  onLoadSample: (key: string) => void;
  onOpenExport: () => void;
  onOpenHelp: () => void;
}

export function TopBar({
  analysis,
  isLoading,
  loadingStage,
  onAnalyze,
  onUploadZip,
  onLoadSample,
  onOpenExport,
  onOpenHelp,
}: TopBarProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [showSamplesMenu, setShowSamplesMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || isLoading) return;
    onAnalyze(inputUrl.trim());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('ZIP archive exceeds 25MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (base64) {
        onUploadZip(file.name, base64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <header className="h-14 bg-[#101217] border-b border-[#242833] px-4 flex items-center justify-between gap-4 select-none shrink-0 z-30">
      {/* Brand Zone */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded border border-[#c5a059]/40 bg-[#161922] flex items-center justify-center text-[#c5a059] shadow-sm">
          <Compass className="w-4 h-4 animate-[spin_40s_linear_infinite]" />
        </div>
        <div className="flex flex-col">
          <span className="font-serif-atlas text-sm font-semibold tracking-wide text-[#f4efe6] whitespace-nowrap">
            The Astral Cartographer
          </span>
          <span className="text-[10px] text-[#8e95a5] -mt-0.5 tracking-wider uppercase font-mono">
            Codebase Atlas
          </span>
        </div>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-xl flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="e.g. https://github.com/owner/repository"
            disabled={isLoading}
            className="w-full h-8 pl-3 pr-8 text-xs bg-[#0b0c10] border border-[#262b37] rounded focus:border-[#c5a059] focus:outline-none text-[#ded9cd] placeholder-[#62697a] font-mono tracking-tight transition-colors disabled:opacity-60"
          />
          {inputUrl && (
            <button
              type="button"
              onClick={() => setInputUrl('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#62697a] hover:text-[#ded9cd]"
            >
              ×
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !inputUrl.trim()}
          className="h-8 px-3.5 bg-[#8b263e] hover:bg-[#a12f4b] disabled:bg-[#341b23] disabled:text-[#7d5660] text-white text-xs font-medium rounded flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>Analyze</span>
              <ArrowRight className="w-3 h-3" />
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload local repository as ZIP archive"
          disabled={isLoading}
          className="h-8 px-2.5 bg-[#161922] hover:bg-[#1e2330] border border-[#2a303e] text-[#c9c3b6] text-xs rounded flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Upload className="w-3.5 h-3.5 text-[#c5a059]" />
          <span className="hidden sm:inline">ZIP</span>
        </button>

        {/* Demo Showcases Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSamplesMenu(!showSamplesMenu)}
            className="h-8 px-2.5 bg-[#161922] hover:bg-[#1e2330] border border-[#2a303e] text-[#c5a059] text-xs rounded flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Showcases</span>
          </button>

          {showSamplesMenu && (
            <div
              className="absolute right-0 top-10 w-72 bg-[#12141a] border border-[#2a303e] rounded shadow-xl py-1.5 z-50 text-xs"
              onMouseLeave={() => setShowSamplesMenu(false)}
            >
              <div className="px-3 py-1 text-[11px] font-semibold text-[#8e95a5] uppercase tracking-wider border-b border-[#1f2430]">
                Pre-Indexed Demo Maps
              </div>
              <button
                type="button"
                onClick={() => {
                  onLoadSample('astral-cartographer');
                  setShowSamplesMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#1b1f2b] transition-colors flex flex-col gap-0.5"
              >
                <div className="font-medium text-[#f4efe6] flex items-center justify-between">
                  <span>Astral Cartographer (Self-Map)</span>
                  <span className="text-[10px] text-[#c5a059] font-mono">17 files</span>
                </div>
                <div className="text-[11px] text-[#8e95a5]">
                  Full architectural reflection of this app's modules & types.
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  onLoadSample('chrono-vault');
                  setShowSamplesMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#1b1f2b] transition-colors flex flex-col gap-0.5 border-t border-[#1a1e28]"
              >
                <div className="font-medium text-[#f4efe6] flex items-center justify-between">
                  <span>Chrono-Vault Service</span>
                  <span className="text-[10px] text-[#8b263e] font-mono">Cycles Detected</span>
                </div>
                <div className="text-[11px] text-[#8e95a5]">
                  Contains circular imports between auth & session managers.
                </div>
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Right Controls & Current Repository */}
      <div className="flex items-center gap-2 shrink-0">
        {analysis ? (
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-[#151821] border border-[#252b39] rounded text-xs font-mono text-[#c9c3b6]">
            <GitBranch className="w-3.5 h-3.5 text-[#c5a059]" />
            <span className="text-[#ded9cd] font-semibold">{analysis.repo.fullName}</span>
            <span className="text-[#6d7589]">({analysis.repo.defaultBranch})</span>
          </div>
        ) : null}

        {analysis && (
          <button
            type="button"
            onClick={onOpenExport}
            title="Export architecture data"
            className="h-8 px-2.5 bg-[#161922] hover:bg-[#1e2330] border border-[#2a303e] text-[#c9c3b6] text-xs rounded flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#c5a059]" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenHelp}
          title="Guide & Architecture Methodology"
          className="h-8 w-8 bg-[#161922] hover:bg-[#1e2330] border border-[#2a303e] text-[#c9c3b6] rounded flex items-center justify-center transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-[#8e95a5]" />
        </button>
      </div>
    </header>
  );
}
