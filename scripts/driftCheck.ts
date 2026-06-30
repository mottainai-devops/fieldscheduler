/**
 * driftCheck.ts — Static drift analysis for the fieldscheduler codebase
 *
 * Detects two defect classes:
 *
 *   CLASS A — Schema field drift (Pattern #15)
 *     A tRPC mutation procedure declares a field in its Zod input schema that
 *     is never sent by any client call site. The field exists in the contract
 *     but is a ghost: no client ever populates it.
 *
 *   CLASS B — JSX handler drift (Pattern #44)
 *     A React component references a handler function by name in a JSX event
 *     attribute (e.g. onClick={handleX}) but that function is never defined
 *     in the component file (no local const, function declaration, useCallback
 *     binding, or import). The button renders and appears clickable; the
 *     ReferenceError only fires when the user triggers the event.
 *
 * Usage:
 *   npx tsx scripts/driftCheck.ts           # standard run
 *   npx tsx scripts/driftCheck.ts --verbose  # also list all suppressed items
 *   (or via package.json: pnpm drift:check)
 *
 * Exit codes:
 *   0 — no findings (clean)
 *   1 — findings detected (non-zero so CI can gate later)
 *
 * Performance target: under 10 seconds on the current codebase.
 *
 * ─── False-Positive Categories (Class A) ─────────────────────────────────────
 *
 * Three categories of false positive can cause driftCheck to suppress or skip
 * a finding that would otherwise appear. Each is handled differently:
 *
 * CATEGORY 1 — Spread-operator suppression (automatic)
 *   When a .mutate({...}) or .mutateAsync({...}) call site uses a spread
 *   operator (e.g. `.mutate({ id, ...payload })`), the script cannot
 *   statically determine which fields the spread expression sends. To avoid
 *   false positives, the script conservatively treats any procedure whose call
 *   sites include a spread as "covered" — it will not report ghost fields for
 *   that procedure even if a field is genuinely never sent.
 *
 *   Rationale: A false negative (missed ghost field) is safer than a false
 *   positive (incorrectly flagging a field that IS sent via spread). The
 *   trade-off is intentional. Procedures with spread call sites require manual
 *   review. Run --verbose to list spread-suppressed procedures.
 *
 *   As of T21 (2026-06-29), zero procedures are suppressed by spread.
 *   Note: calendar.updateSchedule is excluded from Class A analysis for a
 *   different reason — its Zod schema uses an external reference (ScheduleInput)
 *   rather than an inline z.object({...}), so the script never parses its fields.
 *   This is a separate known limitation: external/composed Zod schemas are not
 *   resolved by the current implementation.
 *
 * CATEGORY 2 — Cross-repository client suppression (@drift-suppress marker)
 *   The driftCheck scan covers only TypeScript/TSX client code in the
 *   mottainai-devops/fieldscheduler repository. Procedures called by clients
 *   in separate repositories are invisible to the scan:
 *     - fieldscheduler-mobile (Flutter/Dart)
 *     - mottainai-survey-app (Flutter/Dart)
 *     - mottainai-platform-backend (TypeScript, separate repo)
 *     - External API consumers (if any)
 *
 *   For fields that are legitimately sent by a cross-repo client, add a
 *   @drift-suppress marker in a comment immediately preceding the field
 *   declaration in the Zod schema. The marker suppresses the finding and
 *   records the justification for --verbose output.
 *
 *   Marker syntax (any of these formats are accepted):
 *     // @drift-suppress: <justification text>
 *     // @drift-suppress <justification text>
 *     /* @drift-suppress: <justification> *\/
 *
 *   Example:
 *     // @drift-suppress: flutter-only — passed by fieldscheduler-mobile
 *     // ApiService.requestHandoff when scheduleId is null (non-recurring
 *     // routes). Not visible to driftCheck (Dart client, separate repo).
 *     routeId: z.number().int().positive().optional(),
 *
 *   Run --verbose to list all @drift-suppress suppressed fields with their
 *   justifications.
 *
 * CATEGORY 3 — External/composed Zod schema (not yet handled)
 *   Procedures whose .input() receives a reference to an externally-defined
 *   Zod schema (e.g. `.input(ScheduleInput)`) rather than an inline
 *   z.object({...}) are silently skipped — the script never parses their
 *   fields. This is a known limitation with no suppression mechanism yet.
 *   Affected procedures require manual review.
 *
 * ─── Scope Boundaries (Class B) ─────────────────────────────────────────────
 *
 *   IN SCOPE:  named identifier references — onClick={handleX}
 *   OUT OF SCOPE: inline arrows — onClick={() => ...}
 *                 call expressions — onClick={getHandler()}
 *                 property access — onClick={obj.method}
 *                 dynamic dispatch — onClick={handlers[name]}
 */

import { Project, SyntaxKind, Node, SourceFile, ts } from "ts-morph";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration ────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");

const ROUTER_GLOB = "server/routers/**/*.ts";
const ROOT_ROUTER = "server/routers.ts";
const CLIENT_GLOB = "client/src/**/*.{ts,tsx}";

// React synthetic event attributes that take handler functions
const JSX_EVENT_ATTRS = new Set([
  "onClick", "onSubmit", "onChange", "onBlur", "onFocus",
  "onKeyDown", "onKeyUp", "onKeyPress",
  "onMouseDown", "onMouseUp", "onMouseEnter", "onMouseLeave", "onMouseMove",
  "onTouchStart", "onTouchEnd", "onTouchMove",
  "onDoubleClick", "onContextMenu", "onWheel", "onScroll",
  "onInput", "onSelect", "onReset",
  "onDragStart", "onDragEnd", "onDrop", "onDragOver",
]);

// Suffixes for custom props that pass mutation/handler objects as bare identifiers
// e.g. addNoteMutation={addNoteMutation}, onConfirm={handleConfirm}
// These are NOT synthetic events but still represent undefined-reference bugs
const MUTATION_PROP_SUFFIXES = ["Mutation", "Handler", "Callback", "Action", "Fn"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallSiteFields {
  fields: Set<string>;
  hasSpread: boolean;
}

interface SchemaDriftFinding {
  namespace: string;
  procedureName: string;
  routerFile: string;
  routerLine: number;
  fieldName: string;
  zodType: string;
  isOptional: boolean;
}

interface HandlerDriftFinding {
  componentFile: string;
  jsxLine: number;
  attribute: string;
  handlerName: string;
}

interface DriftSuppressedField {
  procedure: string;   // "<namespace>.<procedureName>"
  fieldName: string;
  routerFile: string;
  routerLine: number;
  justification: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relPath(absPath: string): string {
  return path.relative(ROOT, absPath);
}

function getZodTypeName(node: Node): string {
  // Walk up to find the z.xxx() call
  const text = node.getText();
  const match = text.match(/z\.(\w+)/);
  return match ? `z.${match[1]}` : "z.unknown";
}

function isOptionalZodField(propNode: Node): boolean {
  const text = propNode.getText();
  return text.includes(".optional()") || text.includes(".nullable()");
}

/**
 * Extracts the @drift-suppress justification from the source text immediately
 * preceding a given line number. Looks back up to 5 lines for a comment
 * containing "@drift-suppress". Returns the justification string if found,
 * or null if no suppression marker is present.
 *
 * Accepted formats:
 *   // @drift-suppress: <justification>
 *   // @drift-suppress <justification>
 *   /* @drift-suppress: <justification> *\/
 */
function extractDriftSuppress(sourceText: string, fieldLineNumber: number): string | null {
  const lines = sourceText.split("\n");
  // fieldLineNumber is 1-based. The field is at lines[fieldLineNumber-1] (0-based).
  // Strategy: scan backwards from the line immediately before the field, collecting
  // only contiguous comment lines. Stop at the first non-comment line. If any of
  // those comment lines contains @drift-suppress, the field is suppressed.
  // This ensures the marker only applies to the single field it immediately precedes,
  // even when other comment lines (e.g. B3 fix notes) appear between the marker and
  // the field declaration.
  const fieldIdx = fieldLineNumber - 1; // 0-based index of the field line

  // Walk backwards collecting contiguous comment lines
  const commentBlock: string[] = [];
  for (let i = fieldIdx - 1; i >= 0 && i >= fieldIdx - 15; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === "") continue; // skip blank lines within comment block
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      commentBlock.unshift(lines[i]); // prepend to maintain order
    } else {
      break; // hit a non-comment line — stop scanning
    }
  }

  if (commentBlock.length === 0) return null;

  // Check if any comment line in the block contains @drift-suppress
  const suppressLineIdx = commentBlock.findIndex((l) => l.includes("@drift-suppress"));
  if (suppressLineIdx === -1) return null;

  // Collect multi-line justification: the @drift-suppress line + subsequent comment lines
  const justificationParts: string[] = [];

  // First line: everything after @drift-suppress
  const firstLineMatch = commentBlock[suppressLineIdx]?.match(/@drift-suppress[:\s]+(.*)/);
  if (firstLineMatch) justificationParts.push(firstLineMatch[1].trim());

  // Subsequent lines: continuation comment lines (// text)
  for (let i = suppressLineIdx + 1; i < commentBlock.length; i++) {
    const contMatch = commentBlock[i].match(/^\s*\/\/\s*(.*)/);
    if (contMatch) {
      justificationParts.push(contMatch[1].trim());
    } else {
      break;
    }
  }

  return justificationParts.join(" ").trim() || "no justification provided";
}

// ─── Class A: Schema Field Drift ─────────────────────────────────────────────

function extractMutationSchemaFields(
  project: Project
): Map<string, { fields: Map<string, { zodType: string; isOptional: boolean; line: number; driftSuppress: string | null }>; file: string }> {
  /**
   * Returns a map keyed by "<namespace>.<procedureName>" → { fields, file }
   * where fields is a map of fieldName → { zodType, isOptional, line, driftSuppress }
   *
   * Strategy: parse each router file, find .mutation( calls, walk backwards
   * to find .input(z.object({...})) on the same chain, extract property names.
   * For each field, also check for a @drift-suppress marker in the preceding
   * comment lines.
   */

  // First build the namespace map from routers.ts
  const namespaceMap = new Map<string, string>(); // routerExportName → namespace
  const rootRouterFile = project.getSourceFile(path.join(ROOT, ROOT_ROUTER));
  if (rootRouterFile) {
    // Look for appRouter = router({ namespace: someRouter, ... })
    rootRouterFile.forEachDescendant((node) => {
      if (Node.isPropertyAssignment(node)) {
        const name = node.getName();
        const init = node.getInitializer();
        if (init && Node.isIdentifier(init)) {
          namespaceMap.set(init.getText(), name);
        }
      }
    });
  }

  const result = new Map<
    string,
    { fields: Map<string, { zodType: string; isOptional: boolean; line: number; driftSuppress: string | null }>; file: string }
  >();

  const routerFiles = project.getSourceFiles().filter(
    (sf) =>
      sf.getFilePath().includes("/server/routers/") &&
      !sf.getFilePath().endsWith(".test.ts")
  );

  for (const sf of routerFiles) {
    const sourceText = sf.getFullText();

    // Determine namespace for this router file
    const fileName = path.basename(sf.getFilePath(), ".ts");
    // Try to find the exported router variable name
    let namespace = "unknown";
    sf.forEachDescendant((node) => {
      if (Node.isVariableDeclaration(node)) {
        const name = node.getName();
        if (namespaceMap.has(name)) {
          namespace = namespaceMap.get(name)!;
        }
      }
    });
    // Fallback: derive from filename
    if (namespace === "unknown") {
      // e.g. fieldWorker.ts → fieldWorker, customerRouter.ts → customer
      namespace = fileName.replace(/Router$/, "");
    }

    // Find all .mutation( call expressions
    sf.forEachDescendant((node) => {
      if (!Node.isCallExpression(node)) return;
      const expr = node.getExpression();
      if (!Node.isPropertyAccessExpression(expr)) return;
      if (expr.getName() !== "mutation") return;

      // Walk the chain to find .input(z.object({...}))
      let chain: Node = node;
      let inputObjectNode: Node | undefined;
      let procedureName = "unknown";

      // Traverse the full call chain text to find procedure name
      // The chain looks like: publicProcedure.input(z.object({...})).mutation(...)
      // or: router({ procedureName: publicProcedure.input(...).mutation(...) })
      // Find the property assignment that contains this mutation call
      let parent = node.getParent();
      while (parent && !Node.isPropertyAssignment(parent)) {
        parent = parent.getParent();
      }
      if (parent && Node.isPropertyAssignment(parent)) {
        procedureName = parent.getName();
      }

      // Now walk the call chain to find .input(z.object({...}))
      let current: Node = node;
      while (current) {
        if (Node.isCallExpression(current)) {
          const ce = current as ReturnType<typeof node.asKind<SyntaxKind.CallExpression>>;
          if (!ce) break;
          const ceExpr = ce!.getExpression();
          if (Node.isPropertyAccessExpression(ceExpr) && ceExpr.getName() === "input") {
            const args = ce!.getArguments();
            if (args.length > 0) {
              const arg = args[0];
              // Check if it's z.object({...})
              if (Node.isCallExpression(arg)) {
                const argExpr = arg.getExpression();
                if (
                  Node.isPropertyAccessExpression(argExpr) &&
                  argExpr.getName() === "object"
                ) {
                  const objectArgs = arg.getArguments();
                  if (objectArgs.length > 0) {
                    inputObjectNode = objectArgs[0];
                  }
                }
              }
            }
          }
          // Move up the chain
          const innerExpr = ce!.getExpression();
          if (Node.isPropertyAccessExpression(innerExpr)) {
            current = innerExpr.getExpression();
          } else {
            break;
          }
        } else {
          break;
        }
      }

      if (!inputObjectNode || procedureName === "unknown") return;

      // Extract fields from the z.object({ ... }) argument
      const fields = new Map<string, { zodType: string; isOptional: boolean; line: number; driftSuppress: string | null }>();

      if (Node.isObjectLiteralExpression(inputObjectNode)) {
        for (const prop of inputObjectNode.getProperties()) {
          if (Node.isPropertyAssignment(prop) || Node.isShorthandPropertyAssignment(prop)) {
            const fieldName = Node.isPropertyAssignment(prop)
              ? prop.getName()
              : prop.getName();
            const zodType = getZodTypeName(prop);
            const optional = isOptionalZodField(prop);
            const line = prop.getStartLineNumber();
            // Check for @drift-suppress marker in preceding comment lines
            const driftSuppress = extractDriftSuppress(sourceText, line);
            fields.set(fieldName, { zodType, isOptional: optional, line, driftSuppress });
          }
        }
      }

      if (fields.size > 0) {
        const key = `${namespace}.${procedureName}`;
        result.set(key, { fields, file: sf.getFilePath() });
      }
    });
  }

  return result;
}

function extractClientMutateFields(project: Project): Map<string, CallSiteFields[]> {
  /**
   * Returns a map keyed by "<namespace>.<procedureName>" → array of CallSiteFields
   * Each entry represents one .mutate({...}) call site with its fields and whether
   * it uses a spread operator.
   */
  const result = new Map<string, CallSiteFields[]>();

  const clientFiles = project.getSourceFiles().filter(
    (sf) =>
      sf.getFilePath().includes("/client/src/") &&
      !sf.getFilePath().endsWith(".test.ts") &&
      !sf.getFilePath().endsWith(".test.tsx")
  );

  for (const sf of clientFiles) {
    sf.forEachDescendant((node) => {
      if (!Node.isCallExpression(node)) return;
      const expr = node.getExpression();
      if (!Node.isPropertyAccessExpression(expr)) return;
      const methodName = expr.getName();
      if (methodName !== "mutate" && methodName !== "mutateAsync") return;

      const mutationObj = expr.getExpression();
      const mutationVarName = mutationObj.getText().trim();

      let namespace = "";
      let procedureName = "";

      sf.forEachDescendant((n) => {
        if (!Node.isVariableDeclaration(n)) return;
        if (n.getName() !== mutationVarName) return;
        const init = n.getInitializer();
        if (!init) return;
        const text = init.getText();
        const match = text.match(/trpc\.(\w+)\.(\w+)\.useMutation/);
        if (match) {
          namespace = match[1];
          procedureName = match[2];
        }
      });

      if (!namespace || !procedureName) return;

      const key = `${namespace}.${procedureName}`;
      if (!result.has(key)) result.set(key, []);

      const callSite: CallSiteFields = { fields: new Set(), hasSpread: false };

      const args = node.getArguments();
      if (args.length > 0) {
        const arg = args[0];
        if (Node.isObjectLiteralExpression(arg)) {
          for (const prop of arg.getProperties()) {
            if (Node.isPropertyAssignment(prop)) {
              callSite.fields.add(prop.getName());
            } else if (Node.isShorthandPropertyAssignment(prop)) {
              callSite.fields.add(prop.getName());
            } else if (Node.isSpreadAssignment(prop)) {
              callSite.hasSpread = true;
            }
          }
        }
      }

      result.get(key)!.push(callSite);
    });
  }

  return result;
}

// Tracks procedures excluded from Class A due to spread call sites
const spreadSuppressedProcedures: string[] = [];

// Tracks fields excluded from Class A due to @drift-suppress markers
const driftSuppressedFields: DriftSuppressedField[] = [];

function runClassA(project: Project): SchemaDriftFinding[] {
  const schemaMap = extractMutationSchemaFields(project);
  const clientMap = extractClientMutateFields(project);
  const findings: SchemaDriftFinding[] = [];
  spreadSuppressedProcedures.length = 0; // reset on each run
  driftSuppressedFields.length = 0;      // reset on each run

  for (const [key, { fields, file }] of schemaMap) {
    const callSites = clientMap.get(key);

    // If no client call site found at all, skip — procedure may be server-internal
    // or called from a non-standard pattern. Only flag when call sites exist.
    if (!callSites || callSites.length === 0) continue;

    const [namespace, procedureName] = key.split(".");

    for (const [fieldName, { zodType, isOptional, line, driftSuppress }] of fields) {
      // Check for @drift-suppress marker first — suppressed fields are never reported
      if (driftSuppress !== null) {
        driftSuppressedFields.push({
          procedure: key,
          fieldName,
          routerFile: file,
          routerLine: line,
          justification: driftSuppress,
        });
        continue;
      }

      // A field is a ghost if it is not sent by ANY call site.
      // For call sites that use spread, we cannot determine what they send,
      // so we conservatively assume they might send the field.
      // A field is only flagged if:
      //   - It is not explicitly sent by any call site, AND
      //   - No call site uses spread (which could be sending it implicitly)
      const sentByAny = callSites.some((cs) => cs.fields.has(fieldName));
      const coveredBySpread = callSites.some((cs) => cs.hasSpread);

      // Track suppressed procedures (once per procedure, not per field)
      if (coveredBySpread) {
        const procKey = `${namespace}.${procedureName}`;
        if (!spreadSuppressedProcedures.includes(procKey)) {
          spreadSuppressedProcedures.push(procKey);
        }
      }

      if (!sentByAny && !coveredBySpread) {
        findings.push({
          namespace,
          procedureName,
          routerFile: file,
          routerLine: line,
          fieldName,
          zodType,
          isOptional,
        });
      }
    }
  }

  return findings;
}

// ─── Class B: JSX Handler Drift ──────────────────────────────────────────────

/**
 * Returns all identifiers that are "defined" within a specific component node
 * (a function declaration or arrow function). Scoped to the component only —
 * NOT the whole file — so that sibling components' parameters don't pollute
 * the defined set.
 *
 * Collects:
 * - local const/let/var declarations (including destructuring)
 * - nested function declarations
 * - own parameters (props destructuring)
 * - module-level imports (always in scope for any component in the file)
 *
 * NOTE: imports are collected separately from the SourceFile and merged in,
 * since they are always in scope for all components.
 */
function getDefinedIdentifiersInComponent(
  componentNode: Node,
  fileImports: Set<string>
): Set<string> {
  const defined = new Set<string>(fileImports); // imports always in scope

  componentNode.forEachDescendant((node) => {
    // Variable declarations: const x = ..., let x = ...
    if (Node.isVariableDeclaration(node)) {
      const nameNode = node.getNameNode();
      if (Node.isIdentifier(nameNode)) {
        defined.add(nameNode.getText());
      } else if (Node.isObjectBindingPattern(nameNode)) {
        // Destructuring: const { handleX, handleY } = ...
        for (const element of nameNode.getElements()) {
          const binding = element.getNameNode();
          if (Node.isIdentifier(binding)) {
            defined.add(binding.getText());
          }
        }
      } else if (Node.isArrayBindingPattern(nameNode)) {
        for (const element of nameNode.getElements()) {
          if (Node.isBindingElement(element)) {
            const binding = element.getNameNode();
            if (Node.isIdentifier(binding)) {
              defined.add(binding.getText());
            }
          }
        }
      }
    }

    // Nested function declarations: function handleX() {}
    if (Node.isFunctionDeclaration(node)) {
      const name = node.getName();
      if (name) defined.add(name);
    }
  });

  // Own parameters (props destructuring) — only the direct parameters of this
  // component, not nested functions
  if (
    Node.isFunctionDeclaration(componentNode) ||
    Node.isArrowFunction(componentNode) ||
    Node.isFunctionExpression(componentNode)
  ) {
    for (const param of componentNode.getParameters()) {
      const nameNode = param.getNameNode();
      if (Node.isIdentifier(nameNode)) {
        defined.add(nameNode.getText());
      } else if (Node.isObjectBindingPattern(nameNode)) {
        for (const element of nameNode.getElements()) {
          const binding = element.getNameNode();
          if (Node.isIdentifier(binding)) {
            defined.add(binding.getText());
          }
        }
      }
    }
  }

  return defined;
}

/** Collect all import bindings from a source file (always in scope for every component). */
function getFileImports(sf: SourceFile): Set<string> {
  const imports = new Set<string>();
  for (const decl of sf.getImportDeclarations()) {
    const clause = decl.getImportClause();
    if (!clause) continue;
    const defaultBinding = clause.getDefaultImport();
    if (defaultBinding) imports.add(defaultBinding.getText());
    const namedBindings = clause.getNamedBindings();
    if (namedBindings && Node.isNamedImports(namedBindings)) {
      for (const specifier of namedBindings.getElements()) {
        imports.add(specifier.getAliasNode()?.getText() ?? specifier.getName());
      }
    }
    if (namedBindings && Node.isNamespaceImport(namedBindings)) {
      imports.add(namedBindings.getName());
    }
  }
  return imports;
}

/**
 * Walk up the AST from a node and collect all enclosing function scopes
 * (function declarations, arrow functions, function expressions) up to the
 * file root. Returns them ordered from outermost to innermost.
 *
 * This is used to build the full lexical scope chain for a JSX attribute:
 * identifiers defined in any ancestor scope are in scope at the attribute site.
 */
function getEnclosingScopes(node: Node): Node[] {
  const scopes: Node[] = [];
  let current: Node | undefined = node.getParent();
  while (current) {
    if (
      Node.isFunctionDeclaration(current) ||
      Node.isArrowFunction(current) ||
      Node.isFunctionExpression(current)
    ) {
      scopes.unshift(current); // prepend so outermost is first
    }
    current = current.getParent?.();
  }
  return scopes;
}

function runClassB(project: Project): HandlerDriftFinding[] {
  const findings: HandlerDriftFinding[] = [];

  const componentFiles = project.getSourceFiles().filter(
    (sf) =>
      sf.getFilePath().includes("/client/src/") &&
      sf.getFilePath().endsWith(".tsx") &&
      !sf.getFilePath().endsWith(".test.tsx")
  );

  for (const sf of componentFiles) {
    const fileImports = getFileImports(sf);

    sf.forEachDescendant((node) => {
      // Find JSX attributes
      if (!Node.isJsxAttribute(node)) return;

      const attrName = node.getNameNode().getText();
      // IN SCOPE: synthetic event attrs (onClick etc.) AND custom props that pass
      // mutation/handler objects by suffix (e.g. addNoteMutation, onConfirm, handleFn)
      const isEventAttr = JSX_EVENT_ATTRS.has(attrName);
      const isMutationProp = MUTATION_PROP_SUFFIXES.some((suffix) => attrName.endsWith(suffix));
      if (!isEventAttr && !isMutationProp) return;

      const initializer = node.getInitializer();
      if (!initializer) return;

      // We only care about {handleX} — a JSX expression containing a bare identifier
      if (!Node.isJsxExpression(initializer)) return;

      const expr = initializer.getExpression();
      if (!expr) return;

      // Must be a plain identifier (not a call, not a property access, not an arrow)
      if (!Node.isIdentifier(expr)) return;

      const handlerName = expr.getText();

      // Skip common non-handler identifiers that are valid
      if (
        handlerName === "undefined" ||
        handlerName === "null" ||
        handlerName === "true" ||
        handlerName === "false"
      ) return;

      // Compute defined set from the full lexical scope chain:
      // collect identifiers from all ancestor function scopes (outermost first),
      // so that variables defined in outer components are visible in inner callbacks.
      // This prevents sibling components' parameters from masking undefined refs
      // while still allowing outer-scope variables to be referenced in .map() callbacks.
      const enclosingScopes = getEnclosingScopes(node);
      const defined = new Set<string>(fileImports);
      for (const scope of enclosingScopes) {
        // Merge each scope's own declarations and parameters into the defined set
        for (const id of getDefinedIdentifiersInComponent(scope, new Set())) {
          defined.add(id);
        }
      }

      if (!defined.has(handlerName)) {
        findings.push({
          componentFile: sf.getFilePath(),
          jsxLine: node.getStartLineNumber(),
          attribute: `${attrName}={${handlerName}}`,
          handlerName,
        });
      }
    });
  }

  return findings;
}

// ─── Output ───────────────────────────────────────────────────────────────────

function printResults(
  schemaFindings: SchemaDriftFinding[],
  handlerFindings: HandlerDriftFinding[],
  elapsedMs: number,
  verbose: boolean
): void {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════════════");
  lines.push("DRIFT CHECK REPORT");
  lines.push(`Run at: ${new Date().toISOString()}`);
  lines.push("═══════════════════════════════════════════════════════════════════");
  lines.push("");

  // ── Section 1: Schema Drift ──
  lines.push("1. SCHEMA DRIFT FINDINGS (Class A — Pattern #15)");
  lines.push("─────────────────────────────────────────────────");
  if (schemaFindings.length === 0) {
    lines.push("  No schema drift findings.");
  } else {
    for (const f of schemaFindings) {
      lines.push(`  GHOST FIELD`);
      lines.push(`  Procedure : ${f.namespace}.${f.procedureName}`);
      lines.push(`  File      : ${relPath(f.routerFile)}:${f.routerLine}`);
      lines.push(`  Field     : ${f.fieldName} (${f.zodType}${f.isOptional ? ", optional" : ", required"})`);
      lines.push(`  Status    : Declared in schema, never sent by any client call site`);
      lines.push("");
    }
  }

  lines.push("");

  // ── Section 2: JSX Handler Drift ──
  lines.push("2. JSX HANDLER DRIFT FINDINGS (Class B — Pattern #44)");
  lines.push("───────────────────────────────────────────────────────");
  if (handlerFindings.length === 0) {
    lines.push("  No JSX handler drift findings.");
  } else {
    for (const f of handlerFindings) {
      lines.push(`  GHOST HANDLER`);
      lines.push(`  File      : ${relPath(f.componentFile)}:${f.jsxLine}`);
      lines.push(`  Attribute : ${f.attribute}`);
      lines.push(`  Status    : Handler referenced in JSX but never defined in component`);
      lines.push("");
    }
  }

  lines.push("");

  // ── Section 3: Summary ──
  lines.push("3. SUMMARY");
  lines.push("───────────");
  lines.push(`  Schema drift findings  : ${schemaFindings.length}`);
  lines.push(`  JSX handler drift      : ${handlerFindings.length}`);
  lines.push(`  Total scan time        : ${(elapsedMs / 1000).toFixed(2)}s`);
  lines.push("");

  const total = schemaFindings.length + handlerFindings.length;
  if (total === 0) {
    lines.push("  ✓ CLEAN — no drift findings detected.");
  } else {
    lines.push(`  ✗ ${total} finding(s) detected. Review above for details.`);
  }

  // ── Suppression notices ──

  // Category 1: Spread suppression
  if (spreadSuppressedProcedures.length > 0) {
    lines.push("");
    lines.push(
      `  NOTE: ${spreadSuppressedProcedures.length} procedure(s) excluded from Class A analysis` +
      ` due to spread operator at call sites (Category 1).`
    );
    if (verbose) {
      lines.push("  Spread-suppressed procedures:");
      for (const proc of spreadSuppressedProcedures) {
        lines.push(`    - ${proc}`);
      }
    } else {
      lines.push("  Run --verbose to list excluded procedures.");
    }
  }

  // Category 2: @drift-suppress markers
  if (driftSuppressedFields.length > 0) {
    lines.push("");
    lines.push(
      `  NOTE: ${driftSuppressedFields.length} field(s) excluded from Class A analysis` +
      ` via @drift-suppress marker (Category 2 — cross-repo client).`
    );
    if (verbose) {
      lines.push("  @drift-suppress suppressed fields:");
      for (const s of driftSuppressedFields) {
        lines.push(`    - ${s.procedure}.${s.fieldName}`);
        lines.push(`      File    : ${relPath(s.routerFile)}:${s.routerLine}`);
        lines.push(`      Reason  : ${s.justification}`);
      }
    } else {
      lines.push("  Run --verbose to list suppressed fields with justifications.");
    }
  }

  lines.push("═══════════════════════════════════════════════════════════════════");

  console.log(lines.join("\n"));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startMs = Date.now();
  const verbose = process.argv.includes("--verbose");

  const project = new Project({
    tsConfigFilePath: path.join(ROOT, "tsconfig.json"),
    skipAddingFilesFromTsConfig: false,
    addFilesFromTsConfig: true,
  });

  // Also add the root router file explicitly
  if (!project.getSourceFile(path.join(ROOT, ROOT_ROUTER))) {
    project.addSourceFileAtPath(path.join(ROOT, ROOT_ROUTER));
  }

  const schemaFindings = runClassA(project);
  const handlerFindings = runClassB(project);

  const elapsedMs = Date.now() - startMs;

  printResults(schemaFindings, handlerFindings, elapsedMs, verbose);

  const total = schemaFindings.length + handlerFindings.length;
  process.exit(total === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("driftCheck fatal error:", err);
  process.exit(2);
});
