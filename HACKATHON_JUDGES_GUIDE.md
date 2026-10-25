# The Astral Cartographer — Hackathon Presentation & Technical Guide 🧭

> **A Complete Architectural Breakdown & Judge Defense Handbook**  
> Everything you need to understand, explain, and showcase **The Astral Cartographer** to hackathon judges.

---

## Table of Contents
1. [The 30-Second Elevator Pitch](#1-the-30-second-elevator-pitch)
2. [The Problem & Why Existing Tools Fall Short](#2-the-problem--why-existing-tools-fall-short)
3. [All Features Explained in Simple Terms](#3-all-features-explained-in-simple-terms)
4. [End-to-End System Architecture & Data Flow](#4-end-to-end-system-architecture--data-flow)
5. [Complete File-by-File Breakdown](#5-complete-file-by-file-breakdown)
6. [Core Algorithms & Technical Depth](#6-core-algorithms--technical-depth)
7. [Step-by-Step Live Demo Script for Judges](#7-step-by-step-live-demo-script-for-judges)
8. [Top 10 Judge Questions & Bulletproof Answers](#8-top-10-judge-questions--bulletproof-answers)

---

## 1. The 30-Second Elevator Pitch

> *"The Astral Cartographer is an interactive codebase intelligence platform that transforms public GitHub repositories or ZIP archives into navigable, celestial architectural maps. Instead of relying on shallow regex scrapers or heavy black-box AI, it executes **real syntax-aware AST parsing** via the TypeScript Compiler API. It extracts true import relationships, calculates coupling metrics (fan-in and fan-out), mathematically detects **circular dependency loops**, and generates an explainable **developer onboarding curriculum**. Developers can explore the graph, inspect raw source code line-by-line, understand blast radii before making changes, and query the architecture using an integrated server-side Gemini assistant."*

---

## 2. The Problem & Why Existing Tools Fall Short

When software engineers join a new company or take over an open-source project, they encounter:
1. **The "Flat File Tree" Trap**: GitHub shows hundreds of files alphabetically in folders. It tells you *where* files are stored on disk, but tells you *nothing* about how data or execution flows between them.
2. **Hidden Circular Coupling**: Circular imports (`A imports B, B imports A`) quietly cause runtime `undefined` bugs, prevent bundlers from tree-shaking dead code, and create tight architectural knots. Standard linters rarely visualize the full loop path.
3. **Overwhelming Onboarding**: New developers don't know which 5 files to read first. They often get lost reading auxiliary helpers before understanding core models or entry points.
4. **Fear of Changing Code (High Blast Radius)**: Without knowing how many files depend on a module (its fan-in), modifying a shared file risks breaking dozens of downstream systems.

**How The Astral Cartographer solves this**: It gives developers an architectural atlas with topological insights, clear blast-radius metrics, and guided onboarding.

---

## 3. All Features Explained in Simple Terms

| Feature | Simple Explanation | Technical Value |
| :--- | :--- | :--- |
| **Real GitHub Ingestion** | Paste any public GitHub repo URL (`owner/repo`), and the app automatically retrieves metadata, finds the default branch, filters out noise (like `node_modules`), and indexes the source code. | No local installation or cloning needed; works directly in browser. |
| **ZIP Archive Upload** | Drag & drop or upload a local project `.zip` file for instant offline mapping. | Keeps private code local and bypasses GitHub rate limits. Safe in-memory extraction with path-traversal protection. |
| **Syntax-Aware AST Parsing** | Instead of searching text with regex, the app runs the real **TypeScript Compiler API** to parse files into Abstract Syntax Trees. | Accurately catches static `import`, dynamic `import()`, CommonJS `require()`, re-exports, function declarations, and class interfaces. |
| **Interactive Dependency Atlas** | A full-screen interactive graph (powered by Cytoscape.js) where circles and diamonds represent files and directed arrows show which file imports which. | Smooth zoom, pan, drag, layout switching (Organic, Hub-centric, Tree), and 1-hop/2-hop neighborhood filtering. |
| **Circular Dependency Detector** | A graph algorithm scans the network and uncovers closed loops (e.g. `auth.ts ➔ session.ts ➔ auth.ts`), highlighting them in bright crimson. | Helps engineers refactor circular knots and avoid bundling initialization errors. |
| **Coupling Metrics (Fan-In / Fan-Out)** | Counts how many files import a module (**Fan-In**) and how many files that module imports (**Fan-Out**). | Instantly reveals "God Modules" (central hubs with high blast radius) vs "Leaf Modules". |
| **Smart Onboarding Pathfinder** | Ranks repository files in recommended reading order (1. Documentation ➔ 2. Bootstrap Entry ➔ 3. Domain Types ➔ 4. Core Services ➔ 5. Features). | Turns an intimidating 50-file repository into a structured 6-step study curriculum. |
| **Deep Source & Symbol Inspector** | Clicking any node opens real fetched source code with line numbers, extracted exports, declared functions, and direct dependency buttons. | Jump seamlessly from architectural birds-eye view directly into source implementation. |
| **Astral Oracle (Gemini Q&A)** | Ask architectural questions in natural language. Answers are grounded in actual graph context, high fan-in hubs, and source excerpts. | Server-side security (keys never leaked), low-latency reasoning config, and automatic fallback to deterministic graph indexing. |
| **One-Click Pre-Indexed Showcases** | Two instant demo repositories pre-loaded into memory (`Astral Cartographer Self-Map` and `Chrono-Vault Service`). | Zero-latency demo for judges without waiting for network or GitHub API limits. |
| **Data Export** | Export the entire resolved dependency graph as structured JSON or download an Architectural Health Report as Markdown. | Integrates with CI/CD, documentation wikis, or engineering architecture reviews. |

---

## 4. End-to-End System Architecture & Data Flow

Here is the exact lifecycle of a repository analysis:

```
Step 1: Input
User submits a GitHub URL (e.g., https://github.com/expressjs/express) or uploads a ZIP.

Step 2: Server-Side Retrieval (/server/github.ts or /server/zip.ts)
- Safe URL validation & extraction of owner/repo.
- GitHub REST API call: gets repo metadata and default branch.
- Recursive Git Tree fetch: retrieves list of all files.
- Noise Filter: Ignores node_modules, dist, build, .git, images, binaries, and lockfiles.
- Bounded Retrieval: Fetches prioritized source files (.ts, .js, .py, .json) in controlled concurrent batches.

Step 3: Syntax Analysis (/server/parser.ts)
- Every source file is analyzed by the TypeScript Compiler API (`ts.createSourceFile`).
- Gathers:
  * Local & external imports
  * Exported declarations & types
  * Functions & class names with line numbers
  * Cyclomatic complexity (branches, loops, conditionals)

Step 4: Dependency Graph Compilation (/server/analyzer.ts)
- Path Resolver maps relative strings (e.g. `../services/auth`) to exact indexed file paths.
- Creates Directed Edges: `source` (file importing) ➔ `target` (file imported).
- Counts Fan-In and Fan-Out for every file.
- DFS Cycle Algorithm identifies all circular loops.
- Heuristic algorithm generates the Onboarding Curriculum.

Step 5: Frontend Rendering (/src/App.tsx & /src/components/AtlasGraph.tsx)
- Server responds with structured AnalysisResult JSON.
- Cytoscape.js mounts canvas with custom cartographic styling.
- Left sidebar renders expandable folder tree; Right sidebar shows file inspector & metrics.
- Clicking any node focuses its direct upstream/downstream neighborhood.
```

---

## 5. Complete File-by-File Breakdown

### Backend Files (`/server`)

#### 1. `server.ts` — The Server Entry Point
- **What it does**: Express server running on port 3000. It hosts both the backend REST API endpoints and mounts Vite middleware (`vite.middlewares`) for serving the frontend in development (or static `/dist` in production).
- **Key Endpoints**:
  - `GET /api/health`: Health status, checks whether Gemini API key is configured.
  - `GET /api/samples`: Lists pre-indexed showcase codebases.
  - `POST /api/samples/:key`: Instantly loads a showcase into active session.
  - `POST /api/analyze`: Ingests GitHub URLs, coordinates retrieval, parsing, and analysis.
  - `POST /api/analyze/upload`: Ingests base64-encoded ZIP archives safely.
  - `GET /api/analysis/:id`: Retrieves full analysis metadata, graph, and metrics.
  - `GET /api/analysis/:id/file?path=...`: Returns source code & symbols for a specific file.
  - `POST /api/analysis/:id/ask`: Answers codebase questions via Gemini or deterministic index.

#### 2. `server/types.ts` — Central Data Contracts
- **What it does**: Defines shared TypeScript interfaces used across backend and frontend.
- **Key Types**:
  - `GraphNode`: `{ id, name, path, language, fileRole, lineCount, fanIn, fanOut, complexity, directory }`
  - `GraphEdge`: `{ id, source, target, type: 'imports', resolved: boolean, symbols: string[] }`
  - `DependencyCycle`: `{ id, length, files: string[], severity: 'critical' | 'warning' }`
  - `ArchitecturalMetrics`: `{ totalFiles, analyzedFiles, totalLines, resolvedEdgesCount, circularDependencyCount, maxFanIn, maxFanOut, ... }`
  - `OnboardingStep`: `{ rank, fileId, filePath, fileName, role, reason, keySymbols, ... }`
  - `AnalysisResult`: Complete response object encapsulating all the above.

#### 3. `server/parser.ts` — AST Parsing Engine
- **What it does**: Analyzes source code files and extracts meaningful architectural data.
- **How it works**:
  - For **TypeScript & JavaScript**: Uses `ts.createSourceFile` from the official TypeScript Compiler API. It traverses the AST tree using `ts.forEachChild` to detect:
    - `ImportDeclaration` & `ExportDeclaration` with module specifiers
    - Dynamic `import(...)` and CommonJS `require(...)`
    - `FunctionDeclaration`, `ClassDeclaration`, `InterfaceDeclaration`, `TypeAliasDeclaration`
    - Cyclomatic complexity: increments count on `IfStatement`, `ForStatement`, `WhileStatement`, `CaseClause`, `ConditionalExpression`, `&&`, `||`, `??`.
  - For **Python**: Regex/syntax scanner extracting `import`, `from ... import`, `def`, `class`, and branch complexity.
  - **Path Resolver (`resolveLocalImport`)**: Converts relative imports like `./auth` or `@/components/Button` into resolved project file paths (e.g. `src/auth.ts`).

#### 4. `server/analyzer.ts` — Graph Builder & Intelligence Algorithms
- **What it does**: The brain of the application. It connects raw parsed files into a coherent architectural model.
- **Key Algorithms**:
  - **Edge Resolution**: Connects resolved imports between files.
  - **Metrics Calculation**: Computes Fan-In, Fan-Out, language breakdown, and analysis duration in milliseconds.
  - **Cycle Detection (`detectCycles`)**: Depth-First Search with recursion stack tracking. Finds closed loops, normalizes ring permutations (so `A➔B➔A` is not counted twice as `B➔A➔B`), and tags loops by severity.
  - **Architectural Findings (`generateFindings`)**: Evaluates coupling risks, flags "God Modules" (high fan-in), identifies heavy orchestrators (high fan-out), isolated dead code, and complexity hotspots.
  - **Smart Onboarding Pathfinder (`generateOnboardingPath`)**: Evaluates repository topology to rank files in logical reading order: README ➔ Bootstrap Entry ➔ Domain Models ➔ Shared Foundation ➔ Feature Modules.

#### 5. `server/github.ts` — GitHub API Ingestion Client
- **What it does**: Safely talks to the GitHub REST API without requiring user credentials.
- **Features**:
  - Validates repository URL formats.
  - Fetches repository metadata and discovers the default branch (`main`, `master`, etc.).
  - Fetches the recursive Git Tree (`/git/trees/:branch?recursive=1`).
  - Ignores build output, tests, images, lockfiles, and binaries.
  - Prioritizes entry points and core directories (`src/`, `lib/`, `app/`).
  - Retrieves file content in bounded concurrent batches with timeout protection.
  - Gracefully handles 404 (private/missing repos) and 403 (GitHub rate limits).

#### 6. `server/zip.ts` — In-Memory Archive Extractor
- **What it does**: Processes local `.zip` archives.
- **Security & Reliability**:
  - Uses `adm-zip` to extract files directly in RAM—no writing to disk.
  - Defends against Zip Slip / path-traversal attacks: explicitly rejects entries containing `..` or absolute paths.
  - Detects and strips common root folder wrappers (e.g., `repo-main/`).
  - Filters out binaries and generated folders.

#### 7. `server/gemini.ts` — Server-Side Codebase Assistant
- **What it does**: Powering the "Astral Oracle" Q&A feature using `@google/genai` and `gemini-3.8-flash`.
- **Key Highlights**:
  - **Server-Only Security**: API keys are accessed through `process.env.GEMINI_API_KEY` on the server and are NEVER exposed to browser bundles.
  - **Bounded Context**: Rather than feeding the entire repo blindly, it builds a tight architectural brief (repo summary, central hubs, detected cycles, and the selected file's source code).
  - **Speed Optimization**: Configures `thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }` for instant response times.
  - **Deterministic Fallback**: If the Gemini API is temporarily unavailable, it automatically falls back to the deterministic graph index without crashing or delaying the user!

#### 8. `server/sample-data.ts` — Pre-Indexed Demo Showcases
- **What it does**: Contains real, pre-indexed project representations for zero-latency demos.
  - **Astral Cartographer (Self-Map)**: Real architectural self-reflection of this application (server, parser, graph, and UI components).
  - **Chrono-Vault Service**: A multi-tier financial ledger service with intentional circular dependencies between `auth.ts` and `session.ts`.

---

### Frontend Files (`/src`)

#### 9. `src/App.tsx` — Main Application Shell
- **What it does**: Coordinates the entire dashboard state.
- **Manages**:
  - Active `analysis` result and selected file ID (`selectedFileId`).
  - Loading states, progress stage messages, and error states.
  - Synchronization between the File Explorer (left), Dependency Atlas (center), and Inspector (right).
  - Pre-loads the Astral Self-Map on initial launch for immediate visual impact.

#### 10. `src/components/TopBar.tsx` — Top Navigation & Controls
- **What it does**: Clean header containing the product wordmark, repository URL input, "Analyze" button, ZIP upload trigger, Showcases dropdown, current branch tag, Export button, and Help guide.

#### 11. `src/components/AtlasGraph.tsx` — Cytoscape.js Dependency Canvas
- **What it does**: The central interactive graph visualization.
- **Features**:
  - Renders files as nodes and imports as directed arrows.
  - **Semantic shapes**: Gold diamonds (entry points), Azure hexagons (types/models), Slate spheres (sources), Glowing Oxblood rings (circular dependencies).
  - **Neighborhood Highlighting**: Clicking a node highlights its upstream dependencies (gold edges) and downstream dependents (cyan edges), dimming unrelated files.
  - **Layout Engine**: Switch between **Organic (CoSE physics)**, **Hub-Centric (Concentric)**, and **Tree (Breadthfirst)**.
  - **Neighborhood Depth**: Toggle 1-hop, 2-hops, or all nodes.
  - Floating zoom, fit-to-view, reset layout controls, and cartographic legend.

#### 12. `src/components/RepoExplorer.tsx` — Expandable File Explorer
- **What it does**: Left sidebar (260px) showing repository hierarchy.
- **Features**:
  - Real-time search across file names, file paths, and extracted symbols.
  - Language filter chips (All, TS, JS, PY).
  - Expandable/collapsible folder tree with badges for entry points and circular warning icons.
  - Synchronized selection: clicking a file updates both the Atlas Graph and the Inspector.

#### 13. `src/components/Inspector.tsx` — Deep File & Health Inspector
- **What it does**: Right sidebar (410px) providing tabbed deep-dive panels:
  - **Source**: Real fetched code with line numbers, copy-to-clipboard, extracted exports, and declared symbols.
  - **Dependencies**: Lists outgoing dependencies (what it imports) and incoming dependents (what imports it) with one-click navigation.
  - **Health**: Architectural findings, coupling warnings, and clickable circular dependency loop chains.
  - **Onboarding**: Step-by-step reading curriculum with reasons and symbols.
  - **Overview**: Repo stats, lines of code, language breakdown, and analysis duration.
  - **Oracle**: Server-side Gemini Q&A with pre-canned questions and evidence citations.

#### 14. `src/components/ExportModal.tsx` & `HelpModal.tsx`
- **ExportModal**: Exports the full graph as formatted JSON or downloads an Architectural Health Report as Markdown.
- **HelpModal**: In-app modal detailing the AST methodology, graph math, and security guarantees.

#### 15. `src/components/EmptyState.tsx`
- **What it does**: Graceful presentation for loading stages, errors with retry buttons, and showcase selection cards.

#### 16. `src/index.css` & `index.html`
- Configures Tailwind CSS, celestial cartography theme variables, cartographic grid background, custom scrollbars, and loads Google Fonts (*Cinzel*, *Plus Jakarta Sans*, *JetBrains Mono*).

---

## 6. Core Algorithms & Technical Depth

### A. True AST Parsing vs Shallow Regex
*Many hackathon projects use simple regexes like `import .* from '(.*)'`.*  
**Why regex fails**:
- Misses multi-line imports
- Misses dynamic `await import('./foo')`
- Misses CommonJS `const x = require('./foo')`
- Misses re-exports: `export { bar } from './bar'`
- Misses TypeScript `import type { Foo }`

**Our Solution**: We use the official `typescript.createSourceFile()` AST compiler. Every node in the syntax tree is inspected with proper AST token typing.

### B. Cycle Detection via Directed DFS
To detect circular imports:
1. Construct adjacency list `adj: Map<file, file[]>`.
2. Perform Depth-First Search maintaining:
   - `visited: Set<file>`
   - `recursionStack: Set<file>`
   - `currentPath: file[]`
3. If an edge points to a node already in `recursionStack`, a cycle is found!
4. **Canonical Signature Normalization**: The loop `A ➔ B ➔ C ➔ A` is the exact same cycle as `B ➔ C ➔ A ➔ B`. We sort the ring and find the minimum element as canonical starting point, avoiding duplicate cycle reports.

### C. Smart Onboarding Pathfinder Heuristics
The algorithm creates an optimal reading order:
1. **Orientation**: Looks for `README.md` or `/docs`.
2. **Entry Point**: Scans for files named `index`, `main`, `app`, `server` or with `fileRole === 'entry'`.
3. **Domain Contracts**: Identifies files named `types.ts`, `schema.ts`, or `models` with high incoming fan-in.
4. **Core Utilities**: Identifies modules with highest fan-in that don't depend on everything.
5. **Orchestrators & Features**: Ranks remaining business logic files.

---

## 7. Step-by-Step Live Demo Script for Judges

Follow this 2-minute walkthrough when presenting:

1. **The Hook (15 seconds)**:  
   *"Judges, whenever developers clone a new repository, they're blind to its real architecture. We built The Astral Cartographer to transform codebases into navigable architectural maps."*

2. **The Atlas in Action (30 seconds)**:  
   - Point to the central canvas: *"Notice how the app has already mapped its own codebase. The diamond nodes are entry points like `server.ts`, azure hexagons are type contracts like `types.ts`, and circle sizes indicate how central a file is."*
   - Click any node (e.g., `server/analyzer.ts`): *"Notice how clicking highlights its direct dependencies in gold and incoming consumers in cyan, while softly dimming the rest of the galaxy."*

3. **Demonstrating Circular Loop Detection (30 seconds)**:  
   - Click the **Showcases** button in the top bar and select **Chrono-Vault Service**.
   - Watch the graph load instantly.
   - Point to the crimson ring node: *"Notice the crimson nodes. Our DFS cycle detection algorithm detected a circular loop between `auth.ts` and `session.ts`."*
   - Open the **Health** tab on the right sidebar and show the exact cycle path: `src/services/auth.ts ➔ src/services/session.ts ➔ src/services/auth.ts`.
   - Explain the impact: *"Circular dependencies break tree-shaking and risk runtime `undefined` initialization errors. We pinpoint the exact files to decouple."*

4. **Guided Developer Onboarding (20 seconds)**:  
   - Click the **Onboard** tab: *"For new team members, our pathfinder algorithm generates an explainable reading curriculum—from documentation to entry points to models—so engineers get up to speed in hours instead of days."*

5. **Server-Side Gemini Oracle (15 seconds)**:  
   - Switch to the **Oracle** tab: *"We integrated Google Gemini via the modern `@google/genai` SDK on the server. Developers can ask 'Where does application execution begin?' or 'What are the risks of modifying this component?' and get answers grounded in the real dependency graph."*

6. **The Closer (10 seconds)**:  
   - Show the **Export** modal: *"The entire graph can be exported as JSON or Markdown. The Astral Cartographer makes software architecture visible, explainable, and navigable."*

---

## 8. Top 10 Judge Questions & Bulletproof Answers

#### Q1: "How does your tool parse dependencies? Is it just regex?"
**Answer**: *"No, that's one of our key technical differentiators. We use the real TypeScript Compiler API (`typescript`). We compile each file into an in-memory Abstract Syntax Tree, which correctly handles static imports, dynamic `import()`, CommonJS `require()`, re-exports, interfaces, and cyclomatic complexity. Regular expressions fail on multi-line imports and comments; our AST parser does not."*

#### Q2: "What happens if GitHub rate-limits the user?"
**Answer**: *"We have three levels of defense: First, our server parses and prioritizes files in bounded batches. Second, users can drag-and-drop or upload any local `.zip` file, completely bypassing GitHub API limits. Third, we bundle pre-indexed showcase codebases that work 100% offline."*

#### Q3: "Is it safe to analyze untrusted repositories?"
**Answer**: *"Yes, 100% safe. We never execute repository code, install dependencies, or run build scripts. Analysis is purely static. For ZIP uploads, we enforce strict in-memory extraction with path-traversal rejection to prevent directory traversal attacks."*

#### Q4: "Where are API keys stored? Are they secure?"
**Answer**: *"All API keys (Gemini and GitHub) are strictly server-side. The client browser never receives or holds any secrets. Browser requests communicate only with our proxy endpoints (`/api/*`)."*

#### Q5: "How does the Circular Dependency Detector work?"
**Answer**: *"We model the codebase as a directed graph where an edge represents `source imports target`. We execute a Depth-First Search with recursion stack tracking. When an edge points back to a node in the current traversal stack, a cycle is detected. We normalize cycle rings canonically so each loop is reported exactly once."*

#### Q6: "What is Fan-In and Fan-Out, and why should an engineer care?"
**Answer**: *"Fan-In is the number of files importing a given module; Fan-Out is how many files that module imports. A module with high Fan-In is a central hub—modifying it carries a high blast radius because many other files depend on it. A module with high Fan-Out is an orchestrator that depends on many external subsystems."*

#### Q7: "What happens if Gemini is unavailable or slow?"
**Answer**: *"The application is designed to be completely resilient. Core parsing, graph visualization, cycle detection, metrics, and onboarding paths are 100% deterministic and do not depend on AI. For the Oracle assistant, we have a fast 30s timeout and an automatic fallback to our deterministic graph index."*

#### Q8: "How does the graph scale to large repositories?"
**Answer**: *"We enforce smart tree filtering: ignoring build artifacts (`node_modules`, `dist`, `.git`), binary files, and media. We prioritize entry points and core source directories up to 75 prioritized files for fast rendering. On the client, Cytoscape.js handles hundreds of nodes smoothly with 1-hop and 2-hop neighborhood depth filters."*

#### Q9: "Why Cytoscape.js instead of D3 or Three.js?"
**Answer**: *"Cytoscape.js is the gold standard for graph theory and network analysis. It provides dedicated physics layout algorithms (like CoSE and Concentric), robust compound node handling, built-in viewport management, and superior touch and pointer gesture performance on large graphs."*

#### Q10: "Can this be used in CI/CD pipelines?"
**Answer**: *"Yes. Through our export endpoints, teams can output the architectural analysis as JSON or Markdown. You could run this in a GitHub Action to block pull requests that introduce new circular dependency loops or exceed coupling thresholds."*

---

*Good luck with the presentation! You have a complete, fully functioning, and verifiable platform.* 🚀
