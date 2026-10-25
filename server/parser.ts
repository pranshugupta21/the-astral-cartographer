import ts from 'typescript';
import path from 'path';
import {
  SupportedLanguage,
  FileRole,
  ExtractedImport,
  ExtractedExport,
  ExtractedDeclaration,
} from './types';

export function detectLanguage(filePath: string): SupportedLanguage {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.ts':
    case '.tsx':
    case '.mts':
    case '.cts':
      return 'typescript';
    case '.js':
    case '.jsx':
    case '.mjs':
    case '.cjs':
      return 'javascript';
    case '.py':
    case '.pyw':
      return 'python';
    case '.json':
      return 'json';
    case '.md':
    case '.mdx':
      return 'markdown';
    default:
      return 'other';
  }
}

export function detectFileRole(filePath: string): FileRole {
  const lower = filePath.toLowerCase();
  const name = path.basename(lower);

  if (
    lower.includes('.test.') ||
    lower.includes('.spec.') ||
    lower.includes('/tests/') ||
    lower.includes('/__tests__/')
  ) {
    return 'test';
  }
  if (
    name === 'index.ts' ||
    name === 'index.js' ||
    name === 'main.ts' ||
    name === 'main.tsx' ||
    name === 'main.js' ||
    name === 'app.tsx' ||
    name === 'app.ts' ||
    name === 'server.ts' ||
    name === 'server.js' ||
    name === '__main__.py' ||
    name === 'manage.py' ||
    name === 'app.py'
  ) {
    return 'entry';
  }
  if (
    name === 'types.ts' ||
    name === 'schema.ts' ||
    name.endsWith('.d.ts') ||
    lower.includes('/types/') ||
    lower.includes('/models/')
  ) {
    return 'type';
  }
  if (
    name.startsWith('config.') ||
    name.endsWith('.config.js') ||
    name.endsWith('.config.ts') ||
    name === 'tsconfig.json' ||
    name === 'package.json' ||
    name === 'requirements.txt'
  ) {
    return 'config';
  }
  if (name.endsWith('.md') || lower.includes('/docs/')) {
    return 'doc';
  }
  return 'source';
}

export interface ParsedCodeFile {
  imports: ExtractedImport[];
  exports: ExtractedExport[];
  declarations: ExtractedDeclaration[];
  complexity: number;
  warnings: string[];
}

export function parseSourceCode(
  filePath: string,
  content: string,
  language: SupportedLanguage
): ParsedCodeFile {
  if (language === 'typescript' || language === 'javascript') {
    return parseTypeScriptAST(filePath, content);
  } else if (language === 'python') {
    return parsePythonSource(filePath, content);
  } else if (language === 'json') {
    return parseJsonFile(filePath, content);
  }

  return {
    imports: [],
    exports: [],
    declarations: [],
    complexity: 1,
    warnings: [],
  };
}

function parseTypeScriptAST(filePath: string, content: string): ParsedCodeFile {
  const imports: ExtractedImport[] = [];
  const exports: ExtractedExport[] = [];
  const declarations: ExtractedDeclaration[] = [];
  const warnings: string[] = [];
  let complexity = 1;

  try {
    const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    function visit(node: ts.Node) {
      // 1. Calculate Cyclomatic Complexity
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ConditionalExpression: // ternary ? :
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.CatchClause:
          complexity++;
          break;
        case ts.SyntaxKind.BinaryExpression: {
          const binary = node as ts.BinaryExpression;
          const op = binary.operatorToken.kind;
          if (
            op === ts.SyntaxKind.AmpersandAmpersandToken ||
            op === ts.SyntaxKind.BarBarToken ||
            op === ts.SyntaxKind.QuestionQuestionToken
          ) {
            complexity++;
          }
          break;
        }
      }

      // 2. Extract Imports
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const source = moduleSpecifier.text;
          const isLocal = source.startsWith('.') || source.startsWith('/');
          const importedSymbols: string[] = [];

          if (node.importClause) {
            if (node.importClause.name) {
              importedSymbols.push(node.importClause.name.text);
            }
            if (node.importClause.namedBindings) {
              if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                importedSymbols.push(node.importClause.namedBindings.name.text);
              } else if (ts.isNamedImports(node.importClause.namedBindings)) {
                for (const el of node.importClause.namedBindings.elements) {
                  importedSymbols.push(el.name.text);
                }
              }
            }
          }

          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          imports.push({
            raw: node.getText(sourceFile),
            source,
            isExternal: !isLocal,
            isLocal,
            importedSymbols,
            line: line + 1,
          });
        }
      }

      // Re-export statements: export { x } from './foo'
      if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        if (ts.isStringLiteral(node.moduleSpecifier)) {
          const source = node.moduleSpecifier.text;
          const isLocal = source.startsWith('.') || source.startsWith('/');
          const importedSymbols: string[] = [];
          if (node.exportClause && ts.isNamedExports(node.exportClause)) {
            for (const el of node.exportClause.elements) {
              importedSymbols.push(el.name.text);
              exports.push({ name: el.name.text, kind: 'variable' });
            }
          }
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          imports.push({
            raw: node.getText(sourceFile),
            source,
            isExternal: !isLocal,
            isLocal,
            importedSymbols,
            line: line + 1,
          });
        }
      }

      // Dynamic imports: import('./path')
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length > 0 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const source = (node.arguments[0] as ts.StringLiteral).text;
        const isLocal = source.startsWith('.') || source.startsWith('/');
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        imports.push({
          raw: node.getText(sourceFile),
          source,
          isExternal: !isLocal,
          isLocal,
          importedSymbols: ['[dynamic]'],
          line: line + 1,
        });
      }

      // require('...')
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'require' &&
        node.arguments.length > 0 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const source = (node.arguments[0] as ts.StringLiteral).text;
        const isLocal = source.startsWith('.') || source.startsWith('/');
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        imports.push({
          raw: node.getText(sourceFile),
          source,
          isExternal: !isLocal,
          isLocal,
          importedSymbols: ['[require]'],
          line: line + 1,
        });
      }

      // 3. Extract Declarations & Exports
      if (ts.isFunctionDeclaration(node)) {
        const name = node.name ? node.name.text : 'anonymous';
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        declarations.push({ name, kind: 'function', line: line + 1 });

        const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        const isDefault = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
        if (isExported) {
          exports.push({ name: isDefault ? 'default' : name, kind: 'function', line: line + 1 });
        }
      } else if (ts.isClassDeclaration(node)) {
        const name = node.name ? node.name.text : 'anonymous';
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        declarations.push({ name, kind: 'class', line: line + 1 });

        const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        const isDefault = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
        if (isExported) {
          exports.push({ name: isDefault ? 'default' : name, kind: 'class', line: line + 1 });
        }
      } else if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        declarations.push({ name, kind: 'interface', line: line + 1 });
        const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        if (isExported) {
          exports.push({ name, kind: 'interface', line: line + 1 });
        }
      } else if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        declarations.push({ name, kind: 'type', line: line + 1 });
        const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        if (isExported) {
          exports.push({ name, kind: 'type', line: line + 1 });
        }
      } else if (ts.isVariableStatement(node)) {
        const isExported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            const name = decl.name.text;
            const isFunc =
              decl.initializer &&
              (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
            const { line } = sourceFile.getLineAndCharacterOfPosition(decl.getStart());
            declarations.push({
              name,
              kind: isFunc ? 'function' : 'variable',
              line: line + 1,
            });
            if (isExported) {
              exports.push({
                name,
                kind: isFunc ? 'function' : 'variable',
                line: line + 1,
              });
            }
          }
        }
      } else if (ts.isExportAssignment(node)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        exports.push({ name: 'default', kind: 'default', line: line + 1 });
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  } catch (err: any) {
    warnings.push(`AST parsing warning: ${err.message || String(err)}`);
  }

  return { imports, exports, declarations, complexity, warnings };
}

function parsePythonSource(filePath: string, content: string): ParsedCodeFile {
  const imports: ExtractedImport[] = [];
  const exports: ExtractedExport[] = [];
  const declarations: ExtractedDeclaration[] = [];
  const warnings: string[] = [];
  let complexity = 1;

  const lines = content.split('\n');

  lines.forEach((lineText, idx) => {
    const trimmed = lineText.trim();
    const lineNum = idx + 1;

    // Skip comments
    if (trimmed.startsWith('#')) return;

    // Complexity triggers
    if (
      /\b(if|elif|for|while|except|with)\b/.test(trimmed) ||
      /\band\b|\bor\b/.test(trimmed)
    ) {
      complexity++;
    }

    // from module import symbol1, symbol2
    const fromImportMatch = trimmed.match(/^from\s+([a-zA-Z0-9_.]+)\s+import\s+(.+)$/);
    if (fromImportMatch) {
      const source = fromImportMatch[1];
      const symbolsStr = fromImportMatch[2];
      const isLocal = source.startsWith('.');
      const importedSymbols = symbolsStr
        .split(',')
        .map((s) => s.trim().split(/\s+as\s+/)[0])
        .filter(Boolean);

      imports.push({
        raw: trimmed,
        source,
        isExternal: !isLocal,
        isLocal,
        importedSymbols,
        line: lineNum,
      });
      return;
    }

    // import module1, module2
    const directImportMatch = trimmed.match(/^import\s+([a-zA-Z0-9_., ]+)/);
    if (directImportMatch) {
      const rawModules = directImportMatch[1].split(',');
      for (const m of rawModules) {
        const modName = m.trim().split(/\s+as\s+/)[0];
        if (modName) {
          const isLocal = modName.startsWith('.');
          imports.push({
            raw: trimmed,
            source: modName,
            isExternal: !isLocal,
            isLocal,
            importedSymbols: [modName],
            line: lineNum,
          });
        }
      }
      return;
    }

    // Function definition
    const defMatch = trimmed.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/);
    if (defMatch) {
      const name = defMatch[1];
      declarations.push({ name, kind: 'function', line: lineNum });
      if (!name.startsWith('_')) {
        exports.push({ name, kind: 'function', line: lineNum });
      }
      return;
    }

    // Class definition
    const classMatch = trimmed.match(/^class\s+([a-zA-Z0-9_]+)\s*[:(]/);
    if (classMatch) {
      const name = classMatch[1];
      declarations.push({ name, kind: 'class', line: lineNum });
      if (!name.startsWith('_')) {
        exports.push({ name, kind: 'class', line: lineNum });
      }
      return;
    }
  });

  return { imports, exports, declarations, complexity, warnings };
}

function parseJsonFile(filePath: string, content: string): ParsedCodeFile {
  const imports: ExtractedImport[] = [];
  const exports: ExtractedExport[] = [];
  const declarations: ExtractedDeclaration[] = [];
  const warnings: string[] = [];

  if (filePath.endsWith('package.json')) {
    try {
      const pkg = JSON.parse(content);
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      Object.keys(deps).forEach((depName) => {
        imports.push({
          raw: `"${depName}": "${deps[depName]}"`,
          source: depName,
          isExternal: true,
          isLocal: false,
          importedSymbols: [depName],
        });
      });
    } catch (e: any) {
      warnings.push(`Failed to parse package.json: ${e.message}`);
    }
  }

  return { imports, exports, declarations, complexity: 1, warnings };
}

/**
 * Resolves an import source string (e.g. "./services/auth" or "@/components/card")
 * to one of the indexed candidate file paths in the repository.
 */
export function resolveLocalImport(
  currentFilePath: string,
  importSource: string,
  allFilePaths: Set<string>
): string | undefined {
  if (!importSource.startsWith('.') && !importSource.startsWith('/') && !importSource.startsWith('@/')) {
    return undefined; // External package
  }

  const currentDir = path.dirname(currentFilePath);
  let targetPath = '';

  if (importSource.startsWith('@/')) {
    targetPath = importSource.substring(2); // e.g. "components/card"
  } else {
    targetPath = path.posix.normalize(path.posix.join(currentDir, importSource));
  }

  // Remove leading slash if any
  if (targetPath.startsWith('/')) {
    targetPath = targetPath.substring(1);
  }

  // 1. Direct exact match
  if (allFilePaths.has(targetPath)) {
    return targetPath;
  }

  // 2. Try common extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts', '.py', '.json'];
  for (const ext of extensions) {
    const withExt = targetPath + ext;
    if (allFilePaths.has(withExt)) {
      return withExt;
    }
  }

  // 3. Try index files in directory
  for (const ext of extensions) {
    const withIndex = path.posix.join(targetPath, `index${ext}`);
    if (allFilePaths.has(withIndex)) {
      return withIndex;
    }
  }

  // 4. Try src/ prefix if @/ was used
  if (importSource.startsWith('@/')) {
    const inSrc = path.posix.join('src', importSource.substring(2));
    if (allFilePaths.has(inSrc)) return inSrc;
    for (const ext of extensions) {
      if (allFilePaths.has(inSrc + ext)) return inSrc + ext;
      if (allFilePaths.has(path.posix.join(inSrc, `index${ext}`))) {
        return path.posix.join(inSrc, `index${ext}`);
      }
    }
  }

  return undefined;
}
