import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Star,
  Layers,
} from 'lucide-react';
import { GraphNode, AnalysisResult, SupportedLanguage, FileRole } from '../types';

interface RepoExplorerProps {
  analysis: AnalysisResult | null;
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  nodeData?: GraphNode;
  children: Record<string, TreeNode>;
}

export function RepoExplorer({ analysis, selectedFileId, onSelectFile }: RepoExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<FileRole | 'all'>('all');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  // Build tree from nodes
  const { filteredNodes, treeRoot, totalCount } = useMemo(() => {
    if (!analysis) {
      return { filteredNodes: [], treeRoot: null, totalCount: 0 };
    }

    const allNodes = analysis.nodes;
    const q = searchQuery.toLowerCase().trim();

    const filtered = allNodes.filter((node) => {
      // Language filter
      if (selectedLang !== 'all' && node.language !== selectedLang) return false;
      // Role filter
      if (selectedRole !== 'all' && node.fileRole !== selectedRole) return false;

      // Search query across name, path, and extracted symbols
      if (q) {
        const matchesName = node.name.toLowerCase().includes(q);
        const matchesPath = node.path.toLowerCase().includes(q);
        const meta = analysis.filesIndex[node.id];
        const matchesDecl =
          meta?.declarations?.some((d) => d.name.toLowerCase().includes(q)) ||
          meta?.exports?.some((e) => e.name.toLowerCase().includes(q));

        if (!matchesName && !matchesPath && !matchesDecl) return false;
      }
      return true;
    });

    // Build hierarchy
    const root: TreeNode = {
      name: 'root',
      path: '',
      isFolder: true,
      children: {},
    };

    filtered.forEach((node) => {
      const parts = node.path.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        if (isLast) {
          current.children[part] = {
            name: part,
            path: node.path,
            isFolder: false,
            nodeData: node,
            children: {},
          };
        } else {
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              path: currentPath,
              isFolder: true,
              children: {},
            };
          }
          current = current.children[part];
        }
      }
    });

    return { filteredNodes: filtered, treeRoot: root, totalCount: allNodes.length };
  }, [analysis, searchQuery, selectedLang, selectedRole]);

  // Set of files involved in cycles
  const cycleFilesSet = useMemo(() => {
    if (!analysis) return new Set<string>();
    return new Set(analysis.cycles.flatMap((c) => c.files));
  }, [analysis]);

  if (!analysis) {
    return (
      <aside className="w-64 bg-[#0d0f14] border-r border-[#242833] flex flex-col p-4 text-xs text-[#6e7687]">
        <div className="font-serif-atlas text-[#a7afbf] font-medium tracking-wider mb-2">
          Repository Explorer
        </div>
        <p className="leading-relaxed">
          Ingest a GitHub repository or choose a showcase map above to explore indexed modules.
        </p>
      </aside>
    );
  }

  // Recursive Tree Renderer
  const renderTreeNode = (treeNode: TreeNode, depth = 0) => {
    const keys = Object.keys(treeNode.children).sort((a, b) => {
      const childA = treeNode.children[a];
      const childB = treeNode.children[b];
      // Folders first
      if (childA.isFolder && !childB.isFolder) return -1;
      if (!childA.isFolder && childB.isFolder) return 1;
      return a.localeCompare(b);
    });

    return (
      <div key={treeNode.path || 'root'} className="flex flex-col">
        {keys.map((key) => {
          const item = treeNode.children[key];
          const isCollapsed = Boolean(collapsedFolders[item.path]);

          if (item.isFolder) {
            return (
              <div key={item.path} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleFolder(item.path)}
                  style={{ paddingLeft: `${depth * 12 + 8}px` }}
                  className="h-7 pr-2 flex items-center gap-1.5 text-xs text-[#a6adb8] hover:text-[#f4efe6] hover:bg-[#151821] rounded transition-colors text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 text-[#6c7485] shrink-0" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-[#6c7485] shrink-0" />
                  )}
                  {isCollapsed ? (
                    <Folder className="w-3.5 h-3.5 text-[#c5a059]/80 shrink-0" />
                  ) : (
                    <FolderOpen className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                  )}
                  <span className="truncate font-mono text-[11px] font-medium">{item.name}</span>
                </button>
                {!isCollapsed && renderTreeNode(item, depth + 1)}
              </div>
            );
          }

          // File Node
          const isSelected = selectedFileId === item.path;
          const isCyclic = cycleFilesSet.has(item.path);
          const role = item.nodeData?.fileRole;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onSelectFile(item.path)}
              style={{ paddingLeft: `${depth * 12 + 20}px` }}
              className={`h-7 pr-2 flex items-center justify-between text-xs rounded transition-colors text-left font-mono ${
                isSelected
                  ? 'bg-[#8b263e]/20 text-[#f4efe6] border border-[#8b263e]/50 font-semibold'
                  : 'text-[#c0b9a8] hover:text-[#f4efe6] hover:bg-[#151821]'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                {role === 'entry' ? (
                  <Star className="w-3 h-3 text-[#c5a059] shrink-0 fill-[#c5a059]/30" />
                ) : (
                  <FileCode className="w-3 h-3 text-[#6e7789] shrink-0" />
                )}
                <span className="truncate text-[11px]">{item.name}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-1">
                {isCyclic && (
                  <span title="Involved in circular dependency loop">
                    <AlertTriangle className="w-3 h-3 text-[#8b263e]" />
                  </span>
                )}
                {item.nodeData && item.nodeData.fanIn > 0 && (
                  <span
                    title={`Fan-in: imported by ${item.nodeData.fanIn} modules`}
                    className="text-[9px] text-[#8e95a5] px-1 py-0.2 rounded bg-[#1c202a]"
                  >
                    +{item.nodeData.fanIn}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="w-64 bg-[#0d0f14] border-r border-[#242833] flex flex-col shrink-0 select-none overflow-hidden">
      {/* Explorer Header */}
      <div className="p-3 border-b border-[#20242f] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="font-serif-atlas text-xs font-semibold uppercase tracking-wider text-[#dcd6c7]">
            Explorer
          </span>
          <span className="text-[10px] text-[#c5a059] font-mono px-1.5 py-0.5 rounded bg-[#161a24] border border-[#262c3b]">
            {filteredNodes.length} / {totalCount} files
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#6c7485] absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files or symbols..."
            className="w-full h-7 pl-7 pr-2 bg-[#12141a] border border-[#222733] rounded text-xs text-[#ded9cd] placeholder-[#5c6374] focus:border-[#c5a059] focus:outline-none font-mono"
          />
        </div>

        {/* Language Filter Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10px] font-mono">
          {(['all', 'typescript', 'javascript', 'python'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              className={`px-1.5 py-0.5 rounded transition-colors whitespace-nowrap shrink-0 ${
                selectedLang === lang
                  ? 'bg-[#c5a059] text-[#0d0f14] font-semibold'
                  : 'bg-[#151821] text-[#8e95a5] hover:text-[#ded9cd]'
              }`}
            >
              {lang === 'all' ? 'All' : lang === 'typescript' ? 'TS' : lang === 'javascript' ? 'JS' : 'PY'}
            </button>
          ))}
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {filteredNodes.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#62697a] italic">
            No files match current query.
          </div>
        ) : (
          treeRoot && renderTreeNode(treeRoot)
        )}
      </div>

      {/* Explorer Footer Status */}
      <div className="h-7 px-3 bg-[#0a0b0e] border-t border-[#1a1e27] flex items-center justify-between text-[10px] text-[#6e7687] font-mono">
        <span>{analysis.metrics.resolvedEdgesCount} edges</span>
        <span>{analysis.cycles.length} cycles</span>
      </div>
    </aside>
  );
}
