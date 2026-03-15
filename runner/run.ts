import { spawn, execFileSync as nodeExecFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// --- Configuration ---

const ROOT = resolve(import.meta.dirname, "..");
const SPECS_DIR = join(ROOT, "specs");
const SCAFFOLD_DIR = join(ROOT, "scaffold");
const EVALUATION_DIR = join(ROOT, "evaluation");
const RESULTS_DIR = join(ROOT, "results");
const SCORES_DIR = join(ROOT, "scores");

const DEFAULT_MODELS = ["sonnet", "opus", "haiku"];
const EVALUATOR_MODEL = "sonnet";
const MAX_BUDGET_USD = "5";

// --- Types ---

interface RunConfig {
  specs: string[];     // e.g. ["001-event-registration-form"]
  models: string[];    // e.g. ["sonnet", "opus"]
  dryRun: boolean;
}

interface SpecFiles {
  specMd: string;
  dataModel: string;
}

interface EvaluationFiles {
  expectedSignals: string;
  rubricMd: string;
  antiPatternsMd: string;
}

interface CategoryScore {
  score: number;
  justification: string;
}

interface EvaluationResult {
  categories: Record<string, CategoryScore>;
  anti_patterns_observed: string[];
  strengths: string[];
  weighted_score: number;
}

interface RunResult {
  spec: string;
  model: string;
  timestamp: string;
  compiles: boolean;
  implementedFiles: Record<string, string>;
  evaluation: EvaluationResult | null;
  evaluationError: string | null;
  implementationError: string | null;
}

// --- Helpers ---

function log(msg: string): void {
  const time = new Date().toISOString().slice(11, 19);
  console.log(`[${time}] ${msg}`);
}

function listSpecs(): string[] {
  return readdirSync(SPECS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function readSpecFiles(specId: string): SpecFiles {
  const dir = join(SPECS_DIR, specId);
  return {
    specMd: readFileSync(join(dir, "spec.md"), "utf-8"),
    dataModel: readFileSync(join(dir, "data-model.ts"), "utf-8"),
  };
}

function readEvaluationFiles(specId: string): EvaluationFiles {
  return {
    expectedSignals: readFileSync(join(EVALUATION_DIR, specId, "expected-signals.json"), "utf-8"),
    rubricMd: readFileSync(join(EVALUATION_DIR, "rubric.md"), "utf-8"),
    antiPatternsMd: readFileSync(join(EVALUATION_DIR, "anti-patterns.md"), "utf-8"),
  };
}

function setupWorkDir(specId: string, model: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const workDir = join(RESULTS_DIR, `${timestamp}_${specId}_${model}`);

  // Copy scaffold
  cpSync(SCAFFOLD_DIR, workDir, { recursive: true });

  // Copy data-model.ts into src/
  const dataModelSrc = join(SPECS_DIR, specId, "data-model.ts");
  cpSync(dataModelSrc, join(workDir, "src", "data-model.ts"));

  // Install dependencies
  log(`  Installing dependencies in ${workDir}...`);
  nodeExecFileSync("pnpm", ["install", "--silent"], { cwd: workDir, timeout: 120_000 });

  return workDir;
}

function exec(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeout?: number; stdin?: string } = {},
): Promise<{ stdout: string; stderr: string }> {
  const { cwd, timeout = 300_000, stdin } = opts;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill("SIGTERM");
        reject(new Error(`${cmd} timed out after ${timeout}ms`));
      }
    }, timeout);

    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (code !== 0) {
        reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}\nstderr: ${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      reject(new Error(`${cmd} failed to start: ${err.message}`));
    });

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

function collectSourceFiles(srcDir: string): Record<string, string> {
  const files: Record<string, string> = {};

  function walk(dir: string, prefix: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), relPath);
      } else if (/\.(tsx?|css)$/.test(entry.name)) {
        files[relPath] = readFileSync(join(dir, entry.name), "utf-8");
      }
    }
  }

  walk(srcDir, "");
  return files;
}

function formatSourceForPrompt(files: Record<string, string>): string {
  return Object.entries(files)
    .map(([path, content]) => {
      const ext = path.endsWith(".css") ? "css" : "tsx";
      return `### File: src/${path}\n\`\`\`${ext}\n${content}\`\`\``;
    })
    .join("\n\n");
}

// --- Implementation Phase ---

function buildImplementationPrompt(spec: SpecFiles): string {
  return `You are implementing a React application based on a specification. Follow the spec exactly. Write production-quality code. You may create any files you need within the src/ directory.

The project scaffold is already set up with Vite + React 19 + TypeScript. Dependencies are installed. The entry point src/main.tsx is already configured — you only need to implement the app starting from src/App.tsx.

The data model types are already at src/data-model.ts — import from there. Do not modify data-model.ts.

## Specification

${spec.specMd}

## Data Model (src/data-model.ts)

\`\`\`typescript
${spec.dataModel}
\`\`\`

## Constraints

- Implement the entire application now.
- Create all necessary component files, CSS files, and utility files within src/.
- Make sure the code compiles with TypeScript.
- Follow the spec precisely.`;
}

async function runImplementation(specId: string, model: string, workDir: string): Promise<{ files: Record<string, string>; compiles: boolean; error: string | null }> {
  const spec = readSpecFiles(specId);
  const prompt = buildImplementationPrompt(spec);

  log(`  Running implementation with model=${model}...`);

  try {
    await exec("claude", [
      "--print",
      "--model", model,
      "--permission-mode", "bypassPermissions",
      "--max-budget-usd", MAX_BUDGET_USD,
      "--no-session-persistence",
      "--allowedTools", "Read", "Write", "Edit", "Bash", "Glob", "Grep",
    ], { cwd: workDir, timeout: 1_800_000, stdin: prompt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`  Implementation failed: ${msg.slice(0, 200)}`);
    return { files: {}, compiles: false, error: msg };
  }

  // Check compilation
  let compiles = false;
  try {
    await exec("npx", ["tsc", "-b", "--noEmit"], { cwd: workDir, timeout: 30_000 });
    compiles = true;
    log(`  TypeScript compilation: OK`);
  } catch {
    log(`  TypeScript compilation: FAILED`);
  }

  const files = collectSourceFiles(join(workDir, "src"));
  return { files, compiles, error: null };
}

// --- Evaluation Phase ---

function buildEvaluationPrompt(
  sourceCode: string,
  evalFiles: EvaluationFiles,
  spec: SpecFiles,
): string {
  return `You are evaluating a React application against a professional quality rubric.

## THE ORIGINAL SPEC

${spec.specMd}

## THE SUBMITTED CODE

${sourceCode}

## EVALUATION RUBRIC

${evalFiles.rubricMd}

## ANTI-PATTERN CATALOG

${evalFiles.antiPatternsMd}

## EXPECTED SIGNALS FOR THIS SPEC

${evalFiles.expectedSignals}

## YOUR TASK

1. Analyze the submitted code carefully against all criteria above.
2. For each rubric category, quote specific code that supports your assessment.
3. Use the rubric_weights from the expected signals to calculate the weighted_score.

Respond with ONLY a JSON object (no markdown fences, no commentary) in this exact format:
{
  "categories": {
    "state_architecture": { "score": <1-5>, "justification": "..." },
    "effect_hygiene": { "score": <1-5>, "justification": "..." },
    "component_design": { "score": <1-5>, "justification": "..." },
    "typescript_quality": { "score": <1-5>, "justification": "..." },
    "performance_awareness": { "score": <1-5>, "justification": "..." },
    "accessibility_semantics": { "score": <1-5>, "justification": "..." }
  },
  "anti_patterns_observed": ["..."],
  "strengths": ["..."],
  "weighted_score": <number 20-100>
}`;
}

async function runEvaluation(
  specId: string,
  files: Record<string, string>,
): Promise<{ result: EvaluationResult | null; error: string | null }> {
  const spec = readSpecFiles(specId);
  const evalFiles = readEvaluationFiles(specId);
  const sourceCode = formatSourceForPrompt(files);
  const prompt = buildEvaluationPrompt(sourceCode, evalFiles, spec);

  log(`  Running evaluation with model=${EVALUATOR_MODEL}...`);

  let stdout: string;
  try {
    const result = await exec("claude", [
      "--print",
      "--model", EVALUATOR_MODEL,
      "--max-budget-usd", "1",
      "--no-session-persistence",
      "--tools", "",
    ], { timeout: 300_000, stdin: prompt });
    stdout = result.stdout;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`  Evaluation failed: ${msg.slice(0, 200)}`);
    return { result: null, error: msg };
  }

  // Parse JSON from response (strip possible markdown fences)
  try {
    const jsonStr = stdout
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();
    const result = JSON.parse(jsonStr) as EvaluationResult;
    log(`  Evaluation score: ${result.weighted_score}`);
    return { result, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`  Failed to parse evaluation JSON: ${msg}`);
    log(`  Raw output (first 500 chars): ${stdout.slice(0, 500)}`);
    return { result: null, error: `JSON parse error: ${msg}\nRaw: ${stdout.slice(0, 1000)}` };
  }
}

// --- Main ---

function parseArgs(): RunConfig {
  const args = process.argv.slice(2);
  const config: RunConfig = {
    specs: [],
    models: [],
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--spec":
        config.specs.push(args[++i]);
        break;
      case "--model":
        config.models.push(args[++i]);
        break;
      case "--dry-run":
        config.dryRun = true;
        break;
      case "--help":
        console.log(`Usage: node runner/run.ts [options]

Options:
  --spec <id>     Spec to run (repeatable). Default: all specs.
  --model <name>  Model to test (repeatable). Default: ${DEFAULT_MODELS.join(", ")}.
  --dry-run       Show what would run without executing.
  --help          Show this help.

Examples:
  node runner/run.ts
  node runner/run.ts --spec 001-event-registration-form --model sonnet
  node runner/run.ts --model sonnet --model opus
`);
        process.exit(0);
    }
  }

  if (config.specs.length === 0) config.specs = listSpecs();
  if (config.models.length === 0) config.models = DEFAULT_MODELS;

  return config;
}

async function runSingle(specId: string, model: string): Promise<RunResult> {
  const timestamp = new Date().toISOString();
  log(`Starting: spec=${specId} model=${model}`);

  // Setup working directory
  const workDir = setupWorkDir(specId, model);
  log(`  Work dir: ${workDir}`);

  // Phase 1: Implementation
  const impl = await runImplementation(specId, model, workDir);

  if (impl.error || Object.keys(impl.files).length === 0) {
    return {
      spec: specId,
      model,
      timestamp,
      compiles: false,
      implementedFiles: impl.files,
      evaluation: null,
      evaluationError: null,
      implementationError: impl.error ?? "No files produced",
    };
  }

  // Phase 2: Evaluation
  const eval_ = await runEvaluation(specId, impl.files);

  return {
    spec: specId,
    model,
    timestamp,
    compiles: impl.compiles,
    implementedFiles: impl.files,
    evaluation: eval_.result,
    evaluationError: eval_.error,
    implementationError: null,
  };
}

async function main(): Promise<void> {
  const config = parseArgs();
  const allSpecs = listSpecs();

  // Validate specs
  for (const spec of config.specs) {
    if (!allSpecs.includes(spec)) {
      console.error(`Unknown spec: ${spec}`);
      console.error(`Available: ${allSpecs.join(", ")}`);
      process.exit(1);
    }
  }

  const matrix = config.specs.flatMap((spec) =>
    config.models.map((model) => ({ spec, model }))
  );

  console.log(`\nReact Profession Bench`);
  console.log(`=====================`);
  console.log(`Specs:  ${config.specs.join(", ")}`);
  console.log(`Models: ${config.models.join(", ")}`);
  console.log(`Total runs: ${matrix.length}`);
  console.log();

  if (config.dryRun) {
    console.log("Dry run — would execute:");
    for (const { spec, model } of matrix) {
      console.log(`  ${spec} × ${model}`);
    }
    return;
  }

  // Ensure results directory exists
  mkdirSync(RESULTS_DIR, { recursive: true });

  const results: RunResult[] = [];

  for (const { spec, model } of matrix) {
    const result = await runSingle(spec, model);
    results.push(result);
    console.log();
  }

  // --- Write summary ---
  const summaryPath = join(RESULTS_DIR, `summary_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`);

  const summary = results.map((r) => ({
    spec: r.spec,
    model: r.model,
    timestamp: r.timestamp,
    compiles: r.compiles,
    weighted_score: r.evaluation?.weighted_score ?? null,
    categories: r.evaluation
      ? Object.fromEntries(
          Object.entries(r.evaluation.categories).map(([k, v]) => [k, v.score])
        )
      : null,
    error: r.implementationError ?? r.evaluationError ?? null,
  }));

  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  log(`Summary written to ${summaryPath}`);

  // --- Write to scores/ (tracked in git) ---
  mkdirSync(SCORES_DIR, { recursive: true });
  const dateStr = new Date().toISOString().slice(0, 10);
  const specsLabel = config.specs.length === 1 ? config.specs[0] : "multi";
  const scoresPath = join(SCORES_DIR, `${specsLabel}_${dateStr}.json`);
  writeFileSync(scoresPath, JSON.stringify(summary, null, 2));
  log(`Scores written to ${scoresPath}`);

  // --- Write per-run detailed results ---
  for (const r of results) {
    const detailDir = join(RESULTS_DIR, `${r.timestamp.replace(/[:.]/g, "-").slice(0, 19)}_${r.spec}_${r.model}`);
    // The work dir was already created with this naming convention; write evaluation result into it
    const evalPath = join(detailDir, "evaluation-result.json");
    if (r.evaluation) {
      // detailDir may have been created by setupWorkDir already; if not, skip
      if (existsSync(detailDir)) {
        writeFileSync(evalPath, JSON.stringify(r.evaluation, null, 2));
      }
    }
  }

  // --- Print scorecard ---
  console.log("\n========================================");
  console.log("SCORECARD");
  console.log("========================================\n");

  // Table header
  const modelColWidth = Math.max(...config.models.map((m) => m.length), 5);
  const specColWidth = Math.max(...config.specs.map((s) => s.length), 4);

  console.log(
    "Spec".padEnd(specColWidth) + " | " +
    config.models.map((m) => m.padStart(modelColWidth)).join(" | ")
  );
  console.log(
    "-".repeat(specColWidth) + "-+-" +
    config.models.map(() => "-".repeat(modelColWidth)).join("-+-")
  );

  for (const spec of config.specs) {
    const scores = config.models.map((model) => {
      const r = results.find((r) => r.spec === spec && r.model === model);
      if (!r) return "—".padStart(modelColWidth);
      if (r.implementationError) return "ERR".padStart(modelColWidth);
      if (!r.evaluation) return "N/A".padStart(modelColWidth);
      return String(r.evaluation.weighted_score).padStart(modelColWidth);
    });
    console.log(
      spec.padEnd(specColWidth) + " | " +
      scores.join(" | ")
    );
  }

  console.log();

  // Category breakdown for each result
  for (const r of results) {
    if (!r.evaluation) continue;
    console.log(`--- ${r.spec} × ${r.model} (score: ${r.evaluation.weighted_score}) ---`);
    for (const [cat, val] of Object.entries(r.evaluation.categories)) {
      console.log(`  ${cat.padEnd(25)} ${val.score}/5  ${val.justification.slice(0, 80)}...`);
    }
    if (r.evaluation.anti_patterns_observed.length > 0) {
      console.log(`  Anti-patterns: ${r.evaluation.anti_patterns_observed.length}`);
    }
    console.log();
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
