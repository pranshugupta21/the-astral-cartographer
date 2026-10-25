# The Astral Cartographer 🧭✨

> **Interactive Codebase Intelligence & Architectural Atlas**
> Transforming source code repositories into navigable architectural maps with syntax-aware AST parsing, directed dependency graphs, cycle detection, and guided developer onboarding.

---

## 1. Overview & Vision

The Astral Cartographer combines the aesthetic elegance of an ancient celestial architectural atlas with the practical precision of an engineering tool. When navigating unfamiliar codebases, developers are often confronted with flat file trees, hidden circular references, and obscured coupling points. 

The Astral Cartographer answers the essential questions every engineer asks when onboarding:
- **How is the repository structured and layered?**
- **Which modules are the central coupling hubs (high fan-in) and orchestrators (high fan-out)?**
- **Where are circular dependencies lurking and how do they couple module lifecycles?**
- **Which files should an onboarding engineer study first to build a solid mental model?**
- **What is the blast radius and risk of modifying a given component?**

---

## 2. Architecture & Pipeline

The application follows an end-to-end full-stack pipeline built directly inside Google AI Studio:

```
[GitHub URL / ZIP Archive]
          │
          ▼
   1. Repository Ingestion & Tree Filter
      - Filters out build artifacts, dist, node_modules, and binaries
      - Bounded retrieval with concurrency control
          │
          ▼
   2. Syntax-Aware AST Parsing Engine
      - TypeScript Compiler API (`typescript`) for .ts, .tsx, .js, .jsx
      - Extracts imports, exports, functions, classes, and complexity
      - Python AST import & declaration scanner
          │
          ▼
   3. Graph Resolution & Topology
      - Resolves relative & aliased local import paths
      - Distinguishes local vs external package dependencies
      - Edge direction: Source Imports Target
          │
          ▼
   4. Cycle Detection & Architectural Metrics
      - DFS cycle search on directed graph
      - Computes Fan-In, Fan-Out, and cyclomatic complexity
      - Generates evidence-based architectural findings
          │
          ▼
   5. Smart Onboarding Pathfinder
      - Ranks modules using topological and semantic heuristics
          │
          ▼
   6. Interactive Cytoscape.js Atlas & Oracle
      - Organic, Hub-centric, and Tree cartographic projections
      - Real source code viewer with line numbers and declarations
      - Server-side Gemini Q&A grounded strictly in graph evidence
```

---

## 3. Core Features

### A. Real GitHub Repository Ingestion
- Accepts public URLs such as `https://github.com/owner/repository`.
- Ingests repository metadata, discovers the default branch, inspects recursive git trees, and fetches source contents in bounded batches.
- Handles rate-limiting, missing repos, and network timeouts with informative error states.

### B. Safe ZIP Archive Upload
- In-memory archive extraction using `adm-zip`.
- Strict path traversal defense: rejects `..` segments and unsafe absolute paths.
- Automatically strips root folder wrappers and filters out generated directories.

### C. Syntax-Aware AST Analysis
- Powered by the real TypeScript Compiler API (`typescript`).
- Extracts static `import`, dynamic `import()`, CommonJS `require()`, and re-exports.
- Detects exported symbols, interfaces, and function declarations.
- Computes cyclomatic complexity across branch, loop, and ternary constructs.

### D. Interactive Dependency Atlas (Cytoscape.js)
- **Directed Graph:** Arrowheads indicate import direction (`source` ➔ `target`).
- **Semantic Node Visuals:**
  - 🌟 **Gold Diamonds:** Entry points (`main`, `index`, `app`, `server`).
  - 🔷 **Azure Hexagons:** Domain models, schemas, and type definitions.
  - ⭕ **Slate Spheres:** Source modules (scaled by fan-in centrality).
  - 🔴 **Crimson Rings:** Modules participating in circular dependency loops.
- **Neighborhood Highlighting:** Selecting any node highlights its upstream dependencies (gold edges) and downstream dependents (cyan edges), softly dimming unrelated modules.
- **Controls:** Smooth pan, zoom, fit-to-view, depth filtering (1-hop, 2-hops, all), and multiple layouts (Organic CoSE, Concentric Hubs, Tree).

### E. Architectural Findings & Circular Dependency Detector
- Detects closed loop cycles (`A ➔ B ➔ A` or multi-file rings).
- Pinpoints god modules with high fan-in (high regression blast radius).
- Highlights high fan-out orchestrators and isolated leaf files.
- Provides actionable refactoring recommendations.

### F. Guided Onboarding Pathfinder
- Computes a recommended 5–7 step reading curriculum for new developers.
- Sequences files from Documentation ➔ Entry Points ➔ Domain Schemas ➔ Core Shared Services ➔ Features.
- Includes key symbol summaries and one-click "Inspect" navigation.

### G. Server-Side Astral Oracle (Gemini Assistant)
- Uses `@google/genai` TypeScript SDK with `gemini-3.8-flash`.
- Strictly server-side: API keys are never exposed to the client bundle.
- Context-bounded: Grounds answers in graph topology and relevant source excerpts.
- Automatic deterministic fallback: Provides architectural answers even when an external AI API key is unavailable.

---

## 4. Built-in Showcases (One-Click Demos)

For instant offline exploration without waiting for GitHub API rate limits:

1. **Astral Cartographer (Self-Map):** An architectural self-reflection of this very application (`server.ts`, `server/analyzer.ts`, `src/App.tsx`, `src/components/AtlasGraph.tsx`, etc.).
2. **Chrono-Vault Service:** A distributed ledger service containing realistic circular dependencies between `auth.ts` and `session.ts` to test cycle detection and coupling alerts.

---

## 5. Security & Privacy Guarantees

- **No Code Execution:** Repository source files are analyzed statically and never executed.
- **Path Traversal Protection:** ZIP extraction verifies paths and prevents traversal attacks.
- **Server-Side Credentials:** GitHub tokens and Gemini API keys are accessed solely on the server.
- **Size Bounds:** Enforces conservative file count and file size limits.

---

## 6. Deployment Workflow

1. **Build Frontend:** `npm run build`
2. **Start Full-Stack Server:** `npm start` (runs `tsx server.ts` on port 3000)
3. **Environment Secrets:**
   - `GEMINI_API_KEY`: (Optional) Injected automatically in AI Studio Settings > Secrets for Gemini live Q&A.
   - `GITHUB_TOKEN`: (Optional) Increases GitHub REST API rate limit from 60 req/hr to 5,000 req/hr.
