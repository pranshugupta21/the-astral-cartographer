import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  Filter,
  Eye,
  Sliders,
  Layers,
} from 'lucide-react';
import { GraphNode, GraphEdge, AnalysisResult } from '../types';

interface AtlasGraphProps {
  analysis: AnalysisResult | null;
  selectedNodeId: string | null;
  onNodeSelect: (id: string) => void;
}

type LayoutType = 'cose' | 'concentric' | 'breadthfirst';
type DepthFilter = 'all' | '1' | '2';

export function AtlasGraph({ analysis, selectedNodeId, onNodeSelect }: AtlasGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const [currentLayout, setCurrentLayout] = useState<LayoutType>('cose');
  const [depthFilter, setDepthFilter] = useState<DepthFilter>('all');
  const [showLegend, setShowLegend] = useState(true);

  // Set of cyclic files
  const cyclicSet = useRef<Set<string>>(new Set());
  if (analysis) {
    cyclicSet.current = new Set(analysis.cycles.flatMap((c) => c.files));
  }

  // Initialize and update Cytoscape graph
  useEffect(() => {
    if (!containerRef.current || !analysis) return;

    // Build Cytoscape elements
    const elements: cytoscape.ElementDefinition[] = [];

    // Filter nodes if depth filter is active around a selected node
    let activeNodes = analysis.nodes;
    let activeEdges = analysis.edges;

    if (selectedNodeId && depthFilter !== 'all') {
      const maxHops = parseInt(depthFilter, 10);
      const neighborhood = new Set<string>([selectedNodeId]);
      let currentFrontier = new Set<string>([selectedNodeId]);

      for (let hop = 0; hop < maxHops; hop++) {
        const nextFrontier = new Set<string>();
        for (const edge of analysis.edges) {
          if (currentFrontier.has(edge.source)) {
            neighborhood.add(edge.target);
            nextFrontier.add(edge.target);
          }
          if (currentFrontier.has(edge.target)) {
            neighborhood.add(edge.source);
            nextFrontier.add(edge.source);
          }
        }
        currentFrontier = nextFrontier;
      }

      activeNodes = analysis.nodes.filter((n) => neighborhood.has(n.id));
      activeEdges = analysis.edges.filter(
        (e) => neighborhood.has(e.source) && neighborhood.has(e.target)
      );
    }

    // Add nodes
    for (const node of activeNodes) {
      const isCyclic = cyclicSet.current.has(node.id);
      const isEntry = node.fileRole === 'entry';
      const isType = node.fileRole === 'type';

      // Base size scaled by fan-in (central hubs appear larger)
      const size = Math.max(26, Math.min(60, 26 + node.fanIn * 5));

      elements.push({
        group: 'nodes',
        data: {
          id: node.id,
          label: node.name,
          fullPath: node.path,
          language: node.language,
          role: node.fileRole,
          fanIn: node.fanIn,
          fanOut: node.fanOut,
          isCyclic,
          isEntry,
          isType,
          size,
        },
      });
    }

    // Add edges
    for (const edge of activeEdges) {
      elements.push({
        group: 'edges',
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          resolved: edge.resolved,
          symbols: edge.symbols.join(', '),
        },
      });
    }

    // Destroy prior instance if present
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Initialize cytoscape instance with celestial cartography theme
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      boxSelectionEnabled: false,
      autounselectify: false,
      style: [
        // Base Node Style
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            color: '#ded9cd',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '10px',
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'text-background-opacity': 0.85,
            'text-background-color': '#0d0f14',
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
            width: 'data(size)',
            height: 'data(size)',
            'background-color': '#1d222e',
            'border-width': 1.5,
            'border-color': '#c5a059',
            'transition-property': 'background-color, border-color, opacity, border-width',
            'transition-duration': 0.2,
          },
        },
        // Entry Points
        {
          selector: 'node[?isEntry]',
          style: {
            'background-color': '#332918',
            'border-color': '#e5b869',
            'border-width': 2.5,
            shape: 'diamond',
          },
        },
        // Types / Models
        {
          selector: 'node[?isType]',
          style: {
            'background-color': '#152535',
            'border-color': '#4a90e2',
            shape: 'hexagon',
          },
        },
        // Circular Dependencies Nodes (Oxblood alert)
        {
          selector: 'node[?isCyclic]',
          style: {
            'border-color': '#c5304b',
            'border-width': 2.5,
            'background-color': '#2a131b',
          },
        },
        // Selected Node
        {
          selector: 'node:selected, node.selected',
          style: {
            'background-color': '#8b263e',
            'border-color': '#f4efe6',
            'border-width': 3,
            color: '#f4efe6',
            'font-weight': 'bold',
            'font-size': '11px',
            'z-index': 999,
          },
        },
        // Base Edge Style (source imports target)
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#3e372b',
            'target-arrow-color': '#c5a059',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.8,
            'curve-style': 'bezier',
            opacity: 0.7,
            'transition-property': 'line-color, target-arrow-color, width, opacity',
            'transition-duration': 0.2,
          },
        },
        // Dimmed state for neighborhood focusing
        {
          selector: '.dimmed',
          style: {
            opacity: 0.12,
          },
        },
        // Highlighted Outgoing Dependency (this file imports target)
        {
          selector: 'edge.highlight-outgoing',
          style: {
            'line-color': '#c5a059',
            'target-arrow-color': '#c5a059',
            width: 3,
            opacity: 1,
            'z-index': 998,
          },
        },
        // Highlighted Incoming Dependent (target imports this file)
        {
          selector: 'edge.highlight-incoming',
          style: {
            'line-color': '#4a90e2',
            'target-arrow-color': '#4a90e2',
            width: 3,
            opacity: 1,
            'z-index': 998,
          },
        },
        // Highlighted Connected Nodes
        {
          selector: 'node.highlighted',
          style: {
            'border-width': 2.5,
            opacity: 1,
          },
        },
      ],
    });

    cyRef.current = cy;

    // Apply layout
    applyLayout(cy, currentLayout);

    // Click handler for nodes
    cy.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target;
      onNodeSelect(node.id());
    });

    // Click background to unselect
    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        // Clear highlights
        cy.elements().removeClass('dimmed highlighted selected highlight-outgoing highlight-incoming');
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [analysis, depthFilter]);

  // Synchronize selection and neighborhood highlighting when selectedNodeId changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !analysis) return;

    cy.elements().removeClass('dimmed highlighted selected highlight-outgoing highlight-incoming');

    if (!selectedNodeId) return;

    const targetNode = cy.$(`node[id = "${selectedNodeId}"]`);
    if (targetNode.length === 0) return;

    targetNode.addClass('selected');

    // Find outgoing edges (files imported by selected)
    const outgoingEdges = cy.edges(`[source = "${selectedNodeId}"]`);
    outgoingEdges.addClass('highlight-outgoing');
    const importedNodes = outgoingEdges.targets();
    importedNodes.addClass('highlighted');

    // Find incoming edges (files that import selected)
    const incomingEdges = cy.edges(`[target = "${selectedNodeId}"]`);
    incomingEdges.addClass('highlight-incoming');
    const dependentNodes = incomingEdges.sources();
    dependentNodes.addClass('highlighted');

    // Dim remaining elements
    const activeSet = targetNode.union(outgoingEdges).union(importedNodes).union(incomingEdges).union(dependentNodes);
    cy.elements().not(activeSet).addClass('dimmed');

    // Pan smoothly towards selected node if outside current viewport
    cy.animate({
      center: { eles: targetNode },
      duration: 300,
    });
  }, [selectedNodeId, analysis]);

  const applyLayout = (cy: Core, layoutName: LayoutType) => {
    let layoutOptions: any;

    if (layoutName === 'cose') {
      layoutOptions = {
        name: 'cose',
        animate: false,
        randomize: false,
        componentSpacing: 60,
        nodeOverlap: 20,
        idealEdgeLength: 70,
        edgeElasticity: 100,
        nodeRepulsion: 450000,
        gravity: 60,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      };
    } else if (layoutName === 'concentric') {
      layoutOptions = {
        name: 'concentric',
        concentric: (node: any) => node.data('fanIn') * 10 + node.data('fanOut'),
        levelWidth: () => 2,
        minNodeSpacing: 50,
        animate: false,
      };
    } else {
      layoutOptions = {
        name: 'breadthfirst',
        directed: true,
        spacingFactor: 1.2,
        animate: false,
      };
    }

    const layout = cy.layout(layoutOptions);
    layout.run();
    cy.fit(undefined, 35);
  };

  const handleLayoutChange = (layout: LayoutType) => {
    setCurrentLayout(layout);
    if (cyRef.current) {
      applyLayout(cyRef.current, layout);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 40);
    }
  };

  const handleZoom = (factor: number) => {
    if (cyRef.current) {
      const zoom = cyRef.current.zoom();
      cyRef.current.zoom({
        level: zoom * factor,
        renderedPosition: {
          x: cyRef.current.width() / 2,
          y: cyRef.current.height() / 2,
        },
      });
    }
  };

  return (
    <main className="flex-1 h-full relative bg-[#0a0b0e] carto-grid overflow-hidden select-none">
      {/* Cytoscape Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Graph Toolbar */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 p-1 bg-[#12141a]/95 backdrop-blur border border-[#262c3b] rounded shadow-lg z-20 text-xs">
        {/* Layout Switcher */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-[#202533]">
          {(['cose', 'concentric', 'breadthfirst'] as const).map((l) => (
            <button
              key={l}
              onClick={() => handleLayoutChange(l)}
              className={`px-2 py-1 rounded capitalize font-mono text-[11px] transition-colors ${
                currentLayout === l
                  ? 'bg-[#c5a059] text-[#0d0f14] font-semibold'
                  : 'text-[#8e95a5] hover:text-[#ded9cd] hover:bg-[#1a1e29]'
              }`}
            >
              {l === 'cose' ? 'Organic' : l === 'concentric' ? 'Hubs' : 'Tree'}
            </button>
          ))}
        </div>

        {/* Neighborhood Depth Filter */}
        <div className="flex items-center gap-1 px-1.5 border-r border-[#202533] text-[11px] font-mono">
          <span className="text-[#6c7485] text-[10px]">Depth:</span>
          {(['all', '1', '2'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDepthFilter(d)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                depthFilter === d
                  ? 'bg-[#8b263e] text-white font-semibold'
                  : 'text-[#8e95a5] hover:text-[#ded9cd]'
              }`}
            >
              {d === 'all' ? 'All' : `${d}H`}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => handleZoom(1.25)}
            title="Zoom In"
            className="p-1 hover:bg-[#1c212d] text-[#a7afbf] hover:text-[#f4efe6] rounded"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            title="Zoom Out"
            className="p-1 hover:bg-[#1c212d] text-[#a7afbf] hover:text-[#f4efe6] rounded"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleFit}
            title="Fit to Viewport"
            className="p-1 hover:bg-[#1c212d] text-[#a7afbf] hover:text-[#f4efe6] rounded"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => cyRef.current && applyLayout(cyRef.current, currentLayout)}
            title="Reset Layout"
            className="p-1 hover:bg-[#1c212d] text-[#a7afbf] hover:text-[#f4efe6] rounded"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Decorative Cartographic Compass Rose in Corner */}
      <div className="absolute top-3 right-3 pointer-events-none opacity-25 flex flex-col items-center">
        <Compass className="w-12 h-12 text-[#c5a059]" />
        <span className="text-[8px] font-serif-atlas text-[#c5a059] tracking-widest mt-0.5">NORTH</span>
      </div>

      {/* Legend Card */}
      {showLegend && (
        <div className="absolute bottom-3 left-3 p-2.5 bg-[#101217]/95 backdrop-blur border border-[#242936] rounded shadow-xl z-20 text-[11px] font-mono text-[#a5abb7] flex flex-col gap-1.5 max-w-xs">
          <div className="flex items-center justify-between font-serif-atlas text-xs font-semibold text-[#f4efe6] pb-1 border-b border-[#1f2430]">
            <span>Atlas Cartography Legend</span>
            <button
              onClick={() => setShowLegend(false)}
              className="text-[#6c7485] hover:text-[#ded9cd] text-xs font-sans px-1"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rotate-45 bg-[#332918] border border-[#e5b869] inline-block shrink-0" />
              <span>Entry Module</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#152535] border border-[#4a90e2] inline-block shrink-0" />
              <span>Model / Types</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#2a131b] border border-[#c5304b] inline-block shrink-0" />
              <span>Cycle In Loop</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1d222e] border border-[#c5a059] inline-block shrink-0" />
              <span>Source Module</span>
            </div>
          </div>

          <div className="pt-1 border-t border-[#1a1e27] text-[9px] text-[#788194] leading-tight">
            <span className="text-[#c5a059]">Gold edge:</span> Outgoing import (fan-out) ·{' '}
            <span className="text-[#4a90e2]">Cyan edge:</span> Incoming dependent (fan-in)
          </div>
        </div>
      )}

      {!showLegend && (
        <button
          onClick={() => setShowLegend(true)}
          className="absolute bottom-3 left-3 px-2 py-1 bg-[#101217]/90 border border-[#242936] rounded text-[10px] text-[#8e95a5] hover:text-[#ded9cd] z-20 font-mono"
        >
          Show Legend
        </button>
      )}

      {/* Selected Node Quick Ribbon */}
      {selectedNodeId && analysis && (
        <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-[#111319]/90 backdrop-blur border border-[#252b39] rounded text-xs font-mono flex items-center gap-3 text-[#d5cfbe] z-20">
          <div className="flex items-center gap-1.5">
            <span className="text-[#8e95a5]">Selected:</span>
            <span className="font-semibold text-[#f4efe6]">{selectedNodeId}</span>
          </div>
          {cyclicSet.current.has(selectedNodeId) && (
            <span className="text-[10px] text-[#c5304b] font-semibold bg-[#8b263e]/20 px-1.5 py-0.5 rounded border border-[#8b263e]/40">
              Cycle Loop
            </span>
          )}
        </div>
      )}
    </main>
  );
}
