import React from 'react';
import { Compass, X, CheckCircle2, Shield, GitBranch, Cpu } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl bg-[#12141a] border border-[#2a303e] rounded shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 border-b border-[#202533] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#c5a059]" />
            <span className="font-serif-atlas text-sm font-semibold text-[#f4efe6]">
              Cartographic Architecture & Methodology
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#6c7485] hover:text-[#ded9cd] p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4 text-[#c0b9a8] leading-relaxed">
          <section className="flex flex-col gap-1.5">
            <h4 className="font-serif-atlas text-xs font-semibold text-[#f4efe6] uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>1. Syntax-Aware AST Parsing Engine</span>
            </h4>
            <p>
              Unlike shallow regex scrapers, The Astral Cartographer executes real syntax-tree analysis using the <strong>TypeScript Compiler API (<code className="text-[#c5a059]">typescript</code>)</strong> for TypeScript and JavaScript code, extracting:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#ded9cd]">
              <li>Static <code className="text-[#7eb3ff]">import ... from '...'</code> and <code className="text-[#7eb3ff]">export ... from '...'</code> declarations</li>
              <li>Dynamic <code className="text-[#7eb3ff]">import(...)</code> and CommonJS <code className="text-[#7eb3ff]">require(...)</code> calls</li>
              <li>Exported symbols, function declarations, and interface type contracts</li>
              <li>Cyclomatic control-flow complexity calculated across branch statements</li>
            </ul>
          </section>

          <section className="flex flex-col gap-1.5 pt-2 border-t border-[#1e2330]">
            <h4 className="font-serif-atlas text-xs font-semibold text-[#f4efe6] uppercase tracking-wider flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-[#8b263e]" />
              <span>2. Graph Resolution & Cycle Detection</span>
            </h4>
            <p>
              Directed dependency edges follow the standard mathematical convention: <strong>source imports target</strong>.
            </p>
            <p>
              A <strong>Depth-First Search (DFS) recursion stack algorithm</strong> detects all non-trivial circular dependency loops (<code className="text-[#c5304b]">A ➔ B ➔ A</code>), canonicalizes ring signatures to eliminate duplicate permutations, and calculates exact cycle paths.
            </p>
          </section>

          <section className="flex flex-col gap-1.5 pt-2 border-t border-[#1e2330]">
            <h4 className="font-serif-atlas text-xs font-semibold text-[#f4efe6] uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>3. Smart Onboarding Pathfinder Heuristics</span>
            </h4>
            <p>
              A deterministic topological curriculum ranks files to maximize learning velocity:
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-[#ded9cd]">
              <li><strong>Documentation:</strong> README.md and root setup guidelines.</li>
              <li><strong>Bootstrap Entry Points:</strong> Main execution roots that register routers.</li>
              <li><strong>Domain Schemas:</strong> Core models and type contracts with high fan-in.</li>
              <li><strong>Foundation Services:</strong> Shared utilities imported across multiple layers.</li>
              <li><strong>Orchestrators & Features:</strong> Implementation modules.</li>
            </ol>
          </section>

          <section className="flex flex-col gap-1.5 pt-2 border-t border-[#1e2330]">
            <h4 className="font-serif-atlas text-xs font-semibold text-[#f4efe6] uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>4. Security & Privacy Guarantees</span>
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Zero Execution:</strong> Code is analyzed purely statically; repository scripts are never executed.</li>
              <li><strong>Server-Side Security:</strong> GitHub tokens and Gemini keys remain strictly on the backend.</li>
              <li><strong>Path Traversal Defense:</strong> ZIP uploads enforce in-memory extraction with strict <code className="text-[#e55370]">..</code> path rejection.</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0d0f14] border-t border-[#202533] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1b202c] hover:bg-[#262c3d] text-[#f4efe6] rounded font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
