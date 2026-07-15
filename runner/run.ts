import { spawn, execFileSync as nodeExecFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// --- Configuration ---

const ROOT = resolve(import.meta.dirname, "..");
const SPECS_DIR = join(ROOT, "specs");
const SCAFFOLD_DIR = join(ROOT, "scaffold");
const EVALUATION_DIR = join(ROOT, "evaluation");
const RESULTS_DIR = join(ROOT, "results");
const SCORES_DIR = join(ROOT, "scores");

// Agents run here, outside the repo, so the evaluation/, scores/, and
// other-model results/ directories are not reachable via relative paths.
// Source artifacts are copied back to RESULTS_DIR after each run.
const SANDBOX_ROOT = join(tmpdir(), "react-profession-bench");

// Per-implementation spend cap (USD), passed to `claude --max-budget-usd`.
// effort=max burns far more, and the heaviest spec (009-reusable-components,
// which emits the most files) repeatedly blew a flat $5 cap *mid-run* at max
// effort — the CLI then exits non-zero with "Error: Exceeded USD budget", which
// is deterministic at a given budget+effort (retrying or waiting never helps).
// So scale the default by effort, and allow an explicit --max-budget-usd override.
const MAX_BUDGET_USD_DEFAULT = "5";
const MAX_BUDGET_USD_MAX_EFFORT = "15";
let budgetOverrideUsd: string | null = null; // set by --max-budget-usd

function budgetForSpec(spec: ModelSpec): string {
  if (budgetOverrideUsd) return budgetOverrideUsd;
  return spec.effort === "max" ? MAX_BUDGET_USD_MAX_EFFORT : MAX_BUDGET_USD_DEFAULT;
}

// --- Model Registry ---

type CliBackend = "claude" | "copilot" | "codex";
// Reasoning-effort tiers. claude passes this via --effort; codex via the
// `model_reasoning_effort` config key. Both CLIs share this vocabulary.
type Effort = "low" | "medium" | "high" | "xhigh" | "max";

interface ModelSpec {
  backend: CliBackend;
  modelArg: string; // value passed to --model
  effort?: Effort; // claude/codex: reasoning-effort tier
}

const MODEL_REGISTRY: Record<string, ModelSpec> = {
  // Claude CLI models (short aliases — track the latest version)
  "sonnet":   { backend: "claude",  modelArg: "sonnet" },
  "opus":     { backend: "claude",  modelArg: "opus" },
  "haiku":    { backend: "claude",  modelArg: "haiku" },
  // Claude CLI models (version-pinned, default effort = high)
  "sonnet-4.6": { backend: "claude", modelArg: "claude-sonnet-4-6" },
  "sonnet-5":   { backend: "claude", modelArg: "claude-sonnet-5" },
  "opus-4.6":   { backend: "claude", modelArg: "claude-opus-4-6" },
  "opus-4.7":   { backend: "claude", modelArg: "claude-opus-4-7" },
  "opus-4.8":   { backend: "claude", modelArg: "claude-opus-4-8" },
  "fable-5":    { backend: "claude", modelArg: "claude-fable-5" },
  "haiku-4.5":  { backend: "claude", modelArg: "claude-haiku-4-5-20251001" },
  // Claude CLI models (effort variants)
  "opus-4.7-max": { backend: "claude", modelArg: "claude-opus-4-7", effort: "max" },
  "opus-4.8-max": { backend: "claude", modelArg: "claude-opus-4-8", effort: "max" },
  "fable-5-max":  { backend: "claude", modelArg: "claude-fable-5", effort: "max" },
  // Copilot CLI models (OpenAI)
  "gpt-4.1":           { backend: "copilot", modelArg: "gpt-4.1" },
  "gpt-5-mini":        { backend: "copilot", modelArg: "gpt-5-mini" },
  "gpt-5.1":           { backend: "copilot", modelArg: "gpt-5.1" },
  "gpt-5.1-codex":     { backend: "copilot", modelArg: "gpt-5.1-codex" },
  "gpt-5.1-codex-max": { backend: "copilot", modelArg: "gpt-5.1-codex-max" },
  "gpt-5.1-codex-mini": { backend: "copilot", modelArg: "gpt-5.1-codex-mini" },
  "gpt-5.2":           { backend: "copilot", modelArg: "gpt-5.2" },
  "gpt-5.2-codex":     { backend: "copilot", modelArg: "gpt-5.2-codex" },
  "gpt-5.3-codex":     { backend: "copilot", modelArg: "gpt-5.3-codex" },
  "gpt-5.4":           { backend: "copilot", modelArg: "gpt-5.4" },
  // Copilot CLI models (Google)
  "gemini-3-pro-preview": { backend: "copilot", modelArg: "gemini-3-pro-preview" },
  // Codex CLI models (OpenAI GPT-5.6 — three tiers Sol/Terra/Luna, like
  // Opus/Sonnet/Haiku). Effort set via `-c model_reasoning_effort`. We bench at
  // effort=high and effort=max, so each tier gets a version-pinned key per effort.
  "gpt-5.6-luna-high":  { backend: "codex", modelArg: "gpt-5.6-luna",  effort: "high" },
  "gpt-5.6-luna-max":   { backend: "codex", modelArg: "gpt-5.6-luna",  effort: "max" },
  "gpt-5.6-terra-high": { backend: "codex", modelArg: "gpt-5.6-terra", effort: "high" },
  "gpt-5.6-terra-max":  { backend: "codex", modelArg: "gpt-5.6-terra", effort: "max" },
  "gpt-5.6-sol-high":   { backend: "codex", modelArg: "gpt-5.6-sol",   effort: "high" },
  "gpt-5.6-sol-max":    { backend: "codex", modelArg: "gpt-5.6-sol",   effort: "max" },
};

const DEFAULT_MODELS = ["sonnet", "opus", "haiku"];
// The evaluator (LLM judge) is held CONSTANT across every report so scores stay
// cross-comparable — see scores/REPORT_*.md and evaluation/rubric.md. Pin it to
// the exact version, NOT the moving "sonnet" alias: when a new Sonnet ships, the
// alias silently drifts and would change the judge mid-benchmark. Always 4.6.
const DEFAULT_EVAL_MODEL = "sonnet-4.6";

function resolveModel(name: string): ModelSpec {
  const spec = MODEL_REGISTRY[name];
  if (!spec) {
    console.error(`Unknown model: ${name}`);
    console.error(`Available: ${Object.keys(MODEL_REGISTRY).join(", ")}`);
    process.exit(1);
  }
  return spec;
}

function getImplementationArgs(spec: ModelSpec): string[] {
  switch (spec.backend) {
    case "claude": {
      const args = [
        "--print",
        "--model", spec.modelArg,
        "--permission-mode", "bypassPermissions",
        "--max-budget-usd", budgetForSpec(spec),
        "--no-session-persistence",
        "--allowedTools", "Read", "Write", "Edit", "Bash", "Glob", "Grep",
      ];
      if (spec.effort) args.push("--effort", spec.effort);
      return args;
    }
    case "copilot":
      return [
        "--model", spec.modelArg,
        "--allow-all",
      ];
    case "codex": {
      // `codex exec` runs non-interactively and reads the prompt from stdin.
      // The sandbox workDir is a fresh copy in tmpdir (not a git repo), so we
      // must --skip-git-repo-check. We already isolate the workDir ourselves, so
      // bypass codex's own approval+sandbox to let it write files unattended
      // (same posture as claude's bypassPermissions / copilot's --allow-all).
      // --ephemeral avoids persisting session files. --color never keeps output
      // clean for any error-text inspection.
      const args = [
        "exec",
        "--model", spec.modelArg,
        "--skip-git-repo-check",
        "--dangerously-bypass-approvals-and-sandbox",
        "--ephemeral",
        "--color", "never",
      ];
      if (spec.effort) args.push("-c", `model_reasoning_effort="${spec.effort}"`);
      return args;
    }
  }
}

function getEvaluationArgs(spec: ModelSpec): string[] {
  switch (spec.backend) {
    case "claude":
      return [
        "--print",
        "--model", spec.modelArg,
        "--max-budget-usd", "1",
        "--no-session-persistence",
        "--tools", "",
      ];
    case "copilot":
      return [
        "--model", spec.modelArg,
        "--allow-all",
      ];
    case "codex":
      // The evaluator is pinned to sonnet-4.6 (a claude backend), so this path
      // is not exercised today; provided for completeness. `codex exec` reads
      // the rubric prompt from stdin and prints the JSON verdict to stdout.
      return [
        "exec",
        "--model", spec.modelArg,
        "--skip-git-repo-check",
        "--dangerously-bypass-approvals-and-sandbox",
        "--ephemeral",
        "--color", "never",
      ];
  }
}

// --- Types ---

interface RunConfig {
  specs: string[];
  models: string[];
  evalModel: string;
  dryRun: boolean;
  retryOnLimit: boolean;     // wait for the usage window to refill and retry
  maxLimitRetries: number;   // cap on consecutive waits per combo
  maxTransientRetries: number; // immediate retries for non-limit failures (sleep-broken connections etc.)
  keepAwake: boolean;        // hold the Windows host awake during the run (WSL)
  resumePath: string | null; // existing scores file to append to / skip from
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
  failure: FailureInfo | null; // populated when a phase failed
  archiveDir: string;
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

interface RunPaths {
  workDir: string;     // sandboxed location where the agent runs (outside the repo)
  archiveDir: string;  // in-repo location where we preserve artifacts + scores
  runName: string;
}

function setupWorkDir(specId: string, model: string): RunPaths {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const runName = `${timestamp}_${specId}_${model}`;

  // Sandbox the agent outside the repo so relative-path traversal
  // cannot reach evaluation/, scores/, or other runs' results/.
  mkdirSync(SANDBOX_ROOT, { recursive: true });
  const workDir = join(SANDBOX_ROOT, runName);
  const archiveDir = join(RESULTS_DIR, runName);

  // Copy scaffold into the sandbox
  cpSync(SCAFFOLD_DIR, workDir, { recursive: true });

  // Copy data-model.ts into src/
  const dataModelSrc = join(SPECS_DIR, specId, "data-model.ts");
  cpSync(dataModelSrc, join(workDir, "src", "data-model.ts"));

  // Install dependencies in the sandbox
  log(`  Installing dependencies in ${workDir}...`);
  nodeExecFileSync("pnpm", ["install", "--silent"], { cwd: workDir, timeout: 120_000 });

  return { workDir, archiveDir, runName };
}

function archiveRun(workDir: string, archiveDir: string): void {
  // Copy the generated source tree (not node_modules, not dist, not tsbuildinfo)
  // into the repo's results/ directory for post-hoc inspection.
  mkdirSync(archiveDir, { recursive: true });
  const srcSrc = join(workDir, "src");
  if (existsSync(srcSrc)) {
    cpSync(srcSrc, join(archiveDir, "src"), { recursive: true });
  }
  for (const file of ["package.json", "tsconfig.json", "vite.config.ts", "index.html"]) {
    const from = join(workDir, file);
    if (existsSync(from)) cpSync(from, join(archiveDir, file));
  }
}

function cleanupWorkDir(workDir: string): void {
  try {
    rmSync(workDir, { recursive: true, force: true });
  } catch (e) {
    log(`  Warning: could not remove ${workDir}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// An exec failure carries the child's captured streams so callers can inspect
// them. Usage-limit notices in particular are printed to STDOUT (with an empty
// stderr) before the CLI exits non-zero, so the message is invisible unless we
// preserve stdout on the error path.
interface ExecError extends Error {
  stdout: string;
  stderr: string;
  code: number | null;
}

function makeExecError(message: string, stdout: string, stderr: string, code: number | null): ExecError {
  const err = new Error(message) as ExecError;
  err.stdout = stdout;
  err.stderr = stderr;
  err.code = code;
  return err;
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
        reject(makeExecError(`${cmd} timed out after ${timeout}ms`, stdout, stderr, null));
      }
    }, timeout);

    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (code !== 0) {
        reject(makeExecError(
          `${cmd} ${args.join(" ")} exited with code ${code}\nstderr: ${stderr}`,
          stdout, stderr, code,
        ));
      } else {
        resolve({ stdout, stderr });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      reject(makeExecError(`${cmd} failed to start: ${err.message}`, stdout, stderr, null));
    });

    if (stdin) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

// --- Usage-limit / failure classification ---

type FailureKind = "rate_limit" | "fatal" | "budget" | "other";

interface FailureInfo {
  kind: FailureKind;
  // When the provider tells us when the window resets, we honour it; otherwise
  // null and callers fall back to a fixed wait.
  resetAt: Date | null;
  // True when this was a non-zero exit with *no* output on either stream — the
  // signature the claude CLI produces when it silently hits the usage limit in
  // --print mode (empty stdout AND empty stderr, code 1). Indistinguishable
  // from a rare genuine crash by text alone, so callers resolve it with a live
  // probe (see probeRateLimit) rather than guessing.
  ambiguous?: boolean;
}

// Retryable-after-wait: the subscription/API usage window is exhausted but will
// refill. Anthropic resets the 5-hour window on a rolling basis.
const RATE_LIMIT_MARKERS = /usage limit reached|rate.?limit|too many requests|\b429\b|\b529\b|overloaded|limit will reset|please wait and retry/i;
// Not worth waiting on — these need human action, so retrying after a sleep
// would just burn another window.
const FATAL_MARKERS = /credit balance (?:is )?too low|invalid api key|please run \/login|oauth token (?:expired|revoked)|not logged in|authentication failed/i;
// The CLI hit its --max-budget-usd cap mid-run and exited non-zero (message
// "Error: Exceeded USD budget (N)" on stdout). Deterministic for a given
// budget+spec+effort: neither a transient retry nor a usage-limit wait helps —
// only a higher cap does. Must be distinguished from a usage limit (the account
// is perfectly healthy, so a probe would wrongly green-light an immediate retry).
const BUDGET_MARKERS = /exceeded\s+usd\s+budget/i;

// Pull a concrete reset moment out of the failure text when the CLI provides
// one. Recognises a trailing unix epoch (the `...reached|<epoch>` form Claude
// Code emits in print mode), an ISO timestamp, or a `resetsAt` field.
export function parseResetTime(raw: string): Date | null {
  const epoch = raw.match(/(?:reached|reset[a-z]*|retry[- ]?after)[^0-9]{0,16}(\d{10,13})/i);
  if (epoch) {
    const n = Number(epoch[1]);
    const ms = n < 1e12 ? n * 1000 : n; // seconds vs milliseconds
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const iso = raw.match(/reset[a-z]*["':\s]{0,6}(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)/i);
  if (iso) {
    const d = new Date(iso[1]);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

// Inspect a caught error (ideally an ExecError carrying the child's stdout) and
// decide whether it is a transient usage limit, a fatal config problem, or an
// ordinary failure.
export function classifyFailure(err: unknown): FailureInfo {
  const e = err as Partial<ExecError> | undefined;
  const stdout = e?.stdout ?? "";
  const stderr = e?.stderr ?? "";
  const raw = [stdout, stderr, e?.message].filter(Boolean).join("\n");
  if (FATAL_MARKERS.test(raw)) return { kind: "fatal", resetAt: null };
  if (BUDGET_MARKERS.test(raw)) return { kind: "budget", resetAt: null };
  if (RATE_LIMIT_MARKERS.test(raw)) return { kind: "rate_limit", resetAt: parseResetTime(raw) };
  // Observed in practice: a usage limit in --print mode exits non-zero with
  // *both* streams empty and no message. `code` is a number only for a real
  // non-zero exit (null for timeout / spawn failure), so this targets that
  // exact signature without swallowing timeouts.
  const ambiguous = typeof e?.code === "number" && stdout.trim() === "" && stderr.trim() === "";
  return { kind: "other", resetAt: null, ambiguous };
}

// Directly test whether the account is currently usage-limited, by issuing a
// trivial, cheap request. A healthy account answers; a limited one fails the
// same silent way the real run did. Used to disambiguate the empty-output
// code-1 failure signature (see FailureInfo.ambiguous) — far more reliable than
// pattern-matching an error message the CLI doesn't emit.
// One cheap, no-tools request used by both probes below. MUST hit the same
// backend/account as the run being probed — otherwise a codex usage limit would
// be tested against the (healthy) claude account and wrongly green-lit. Returns
// the trimmed stdout (empty string when a claude account is throttled — that CLI
// exits 0 with no text under a usage limit; codex instead exits non-zero with a
// 429 ERROR, so it throws and the catch handles it), or throws on a hard failure.
async function cheapProbe(spec: ModelSpec): Promise<string> {
  const prompt = "Reply with the single word: ok";
  switch (spec.backend) {
    case "claude": {
      const { stdout } = await exec("claude", [
        "--print", "--model", spec.modelArg,
        "--max-budget-usd", "1", "--no-session-persistence", "--tools", "",
      ], { timeout: 120_000, stdin: prompt });
      return stdout.trim();
    }
    case "codex": {
      const { stdout } = await exec("codex", [
        "exec", "--model", spec.modelArg,
        "--skip-git-repo-check", "--dangerously-bypass-approvals-and-sandbox",
        "--ephemeral", "--color", "never",
      ], { timeout: 120_000, stdin: prompt });
      return stdout.trim();
    }
    case "copilot": {
      const { stdout } = await exec("copilot", [
        "--model", spec.modelArg, "--allow-all",
      ], { timeout: 120_000, stdin: prompt });
      return stdout.trim();
    }
  }
}

async function probeRateLimit(spec: ModelSpec): Promise<boolean> {
  try {
    return (await cheapProbe(spec)).length === 0; // empty success == throttled (claude)
  } catch (e) {
    // Probe failed too. If it's an auth/credit problem, waiting won't help, so
    // report "not a limit" and let the caller record the original failure.
    return classifyFailure(e).kind !== "fatal";
  }
}

// Inverse of probeRateLimit, used to wake early from a usage-limit wait: returns
// true only when the account is demonstrably healthy *right now* (the probe got
// a real, non-empty answer). Any error or empty/throttled response → false, so
// the caller keeps waiting. The window refills on a rolling basis and often
// sooner than the conservative 5h fallback, so polling this lets us resume the
// moment it's actually back instead of sleeping out the whole cap.
async function probeAccountHealthy(spec: ModelSpec): Promise<boolean> {
  try {
    return (await cheapProbe(spec)).length > 0;
  } catch {
    return false;
  }
}

// Anthropic resets the 5-hour usage window on a rolling basis. When the failure
// text doesn't name a reset time, wait a touch over 5 hours so the window has
// definitely refilled; always add a small buffer past the named time.
const DEFAULT_LIMIT_WAIT_MS = 5 * 60 * 60 * 1000 + 5 * 60 * 1000; // 5h05m
const RESET_BUFFER_MS = 3 * 60 * 1000; // 3m
const HEARTBEAT_MS = 10 * 60 * 1000; // log progress every 10m while sleeping
const PROBE_WAKE_INTERVAL_MS = 5 * 60 * 1000; // re-probe the account every 5m during a wait
const TRANSIENT_BACKOFF_MS = 30 * 1000; // pause before retrying a non-limit failure

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Wait out a usage limit, but resume the *moment* the window actually refills
// rather than sleeping a fixed duration. The rolling 5h window often comes back
// sooner than any stated/fallback time (observed: 3.4h vs a 5h05m fallback), so
// every PROBE_WAKE_INTERVAL_MS we issue a cheap health probe and resume on the
// first success. The computed time (provider reset + buffer, else the 5h05m
// fallback) becomes a *hard cap*: we never wait longer than that, and never
// shorter than RESET_BUFFER_MS. modelArg is the model to probe with.
async function waitForReset(resetAt: Date | null, spec: ModelSpec): Promise<void> {
  let capMs: number;
  if (resetAt) {
    capMs = resetAt.getTime() - Date.now() + RESET_BUFFER_MS;
    if (capMs < RESET_BUFFER_MS) capMs = RESET_BUFFER_MS; // already past / clock skew
  } else {
    capMs = DEFAULT_LIMIT_WAIT_MS;
  }
  const deadline = Date.now() + capMs;
  log(`  Usage limit hit. Waiting up to ~${Math.round(capMs / 60000)} min` +
    `${resetAt ? ` (provider reset ${resetAt.toISOString().slice(11, 16)} UTC)` : " (no reset time — probing to wake early)"}` +
    `, hard cap ${new Date(deadline).toISOString().slice(11, 16)} UTC...`);
  let lastHeartbeat = Date.now();
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    await sleep(Math.min(PROBE_WAKE_INTERVAL_MS, remaining));
    if (Date.now() >= deadline) break;
    if (await probeAccountHealthy(spec)) {
      log(`  Probe succeeded — window refilled early, resuming now.`);
      return;
    }
    if (Date.now() - lastHeartbeat >= HEARTBEAT_MS) {
      log(`  ...still limited, ~${Math.round((deadline - Date.now()) / 60000)} min left until hard cap`);
      lastHeartbeat = Date.now();
    }
  }
  log(`  Hard cap reached — window should be refilled, resuming.`);
}

// Hold the Windows host awake for the lifetime of the run (WSL only). The
// claude CLI's long calls die when the laptop suspends mid-request, so on a
// laptop we inhibit idle-sleep via SetThreadExecutionState. A persistent
// powershell thread must stay alive to hold the flag; it re-asserts
// periodically and self-expires after ~20h as an orphan backstop. Returns a
// release function; a no-op (with a returned no-op) when interop is absent.
function startKeepAwake(): () => void {
  // ES_CONTINUOUS (0x80000000) | ES_SYSTEM_REQUIRED (0x1) = 2147483649
  const ps = [
    "$s='[DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint e);';",
    "$t=Add-Type -MemberDefinition $s -Name P -Namespace W -PassThru;",
    "for($i=0;$i -lt 1440;$i++){ [void]$t::SetThreadExecutionState(2147483649); Start-Sleep -Seconds 50 }",
  ].join(" ");
  let child: ReturnType<typeof spawn> | null = null;
  try {
    child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "ignore" });
    child.on("error", () => { /* interop missing / not Windows — ignore */ });
    // Never let the inhibitor keep the Node event loop alive — the run must be
    // free to exit the instant the benchmark finishes; release() (and the PS
    // self-expiry) handle teardown.
    child.unref();
    log(`  Keep-awake: idle-sleep inhibited on the Windows host (lid-close still sleeps).`);
  } catch {
    log(`  Keep-awake: unavailable (not WSL?) — continuing without it.`);
    return () => {};
  }
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try { child?.kill(); } catch { /* already gone */ }
  };
  // Ensure the inhibitor never outlives the run, even on Ctrl-C / kill.
  process.once("exit", release);
  process.once("SIGINT", () => { release(); process.exit(130); });
  process.once("SIGTERM", () => { release(); process.exit(143); });
  return release;
}

// One row of the scores file (mirrors the `summary` shape written below).
interface SummaryRow {
  spec: string;
  model: string;
  timestamp: string;
  compiles: boolean;
  weighted_score: number | null;
  categories: Record<string, number> | null;
  error: string | null;
}

function summaryRow(r: RunResult): SummaryRow {
  return {
    spec: r.spec,
    model: r.model,
    timestamp: r.timestamp,
    compiles: r.compiles,
    weighted_score: r.evaluation?.weighted_score ?? null,
    categories: r.evaluation
      ? Object.fromEntries(
          Object.entries(r.evaluation.categories).map(([k, v]) => [k, v.score]),
        )
      : null,
    error: r.implementationError ?? r.evaluationError ?? null,
  };
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

async function runImplementation(specId: string, model: string, workDir: string): Promise<{ files: Record<string, string>; compiles: boolean; error: string | null; failure: FailureInfo | null }> {
  const spec = readSpecFiles(specId);
  const prompt = buildImplementationPrompt(spec);
  const modelSpec = resolveModel(model);

  log(`  Running implementation with ${modelSpec.backend}:${modelSpec.modelArg}...`);

  try {
    await exec(modelSpec.backend, getImplementationArgs(modelSpec), {
      cwd: workDir, timeout: 2_700_000, stdin: prompt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const failure = classifyFailure(e);
    log(`  Implementation failed (${failure.kind}): ${msg.slice(0, 200)}`);
    return { files: {}, compiles: false, error: msg, failure };
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
  return { files, compiles, error: null, failure: null };
}

// --- Evaluation Phase ---

// Valid characters that may follow a backslash inside a JSON string.
const JSON_VALID_ESCAPES = new Set(['"', "\\", "/", "b", "f", "n", "r", "t", "u"]);

// LLM evaluators routinely embed code snippets in their `justification`
// strings — regexes like `\d`, Windows paths like `C:\Users`, or literal
// newlines — none of which are legal JSON. JSON.parse is strict and aborts the
// whole parse on the first offender, which has cost us several re-runs. This
// pass walks the text as a string-aware state machine and makes the two
// repairs that account for essentially all of those failures: it escapes
// invalid backslash sequences and escapes literal control characters that
// appear inside string literals. Structure outside strings is left untouched,
// and escaped quotes (`\"`) are consumed as a unit so they never falsely
// terminate a string.
function repairJsonEscapes(input: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (ch === "\\") {
      const next = input[i + 1];
      if (next !== undefined && JSON_VALID_ESCAPES.has(next)) {
        out += ch + next;
        i++; // consume the escaped char so it is never re-examined
      } else {
        out += "\\\\"; // invalid escape — emit a literal backslash
      }
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    if (ch === "\n") { out += "\\n"; continue; }
    if (ch === "\r") { out += "\\r"; continue; }
    if (ch === "\t") { out += "\\t"; continue; }
    const code = ch.charCodeAt(0);
    if (code < 0x20) { out += "\\u" + code.toString(16).padStart(4, "0"); continue; }
    out += ch;
  }
  return out;
}

// Strip markdown fences and any surrounding prose, leaving the outermost
// { ... } span that the evaluator was asked to emit.
function extractJsonObject(raw: string): string {
  const stripped = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return stripped;
  return stripped.slice(start, end + 1);
}

// Parse the evaluator's response, falling back to a tolerant repair pass when
// strict parsing fails. `repaired` reports whether the fallback was needed.
function parseEvaluationResponse(stdout: string): { result: EvaluationResult; repaired: boolean } {
  const candidate = extractJsonObject(stdout);
  try {
    return { result: JSON.parse(candidate) as EvaluationResult, repaired: false };
  } catch {
    const repaired = repairJsonEscapes(candidate);
    return { result: JSON.parse(repaired) as EvaluationResult, repaired: true };
  }
}

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
  evalModel: string,
): Promise<{ result: EvaluationResult | null; error: string | null; failure: FailureInfo | null }> {
  const spec = readSpecFiles(specId);
  const evalFiles = readEvaluationFiles(specId);
  const sourceCode = formatSourceForPrompt(files);
  const prompt = buildEvaluationPrompt(sourceCode, evalFiles, spec);
  const evalSpec = resolveModel(evalModel);

  log(`  Running evaluation with ${evalSpec.backend}:${evalSpec.modelArg}...`);

  let stdout: string;
  try {
    const result = await exec(evalSpec.backend, getEvaluationArgs(evalSpec), {
      timeout: 300_000, stdin: prompt,
    });
    stdout = result.stdout;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const failure = classifyFailure(e);
    log(`  Evaluation failed (${failure.kind}): ${msg.slice(0, 200)}`);
    return { result: null, error: msg, failure };
  }

  // Parse JSON from response, repairing invalid escapes / control chars if the
  // strict parse fails (see repairJsonEscapes).
  try {
    const { result, repaired } = parseEvaluationResponse(stdout);
    if (repaired) log(`  Recovered evaluation JSON via escape repair`);
    log(`  Evaluation score: ${result.weighted_score}`);
    return { result, error: null, failure: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`  Failed to parse evaluation JSON: ${msg}`);
    log(`  Raw output (first 500 chars): ${stdout.slice(0, 500)}`);
    return { result: null, error: `JSON parse error: ${msg}\nRaw: ${stdout.slice(0, 1000)}`, failure: { kind: "other", resetAt: null } };
  }
}

// --- Main ---

function parseArgs(): RunConfig {
  const args = process.argv.slice(2);
  const specs: string[] = [];
  const models: string[] = [];
  let evalModel = DEFAULT_EVAL_MODEL;
  let dryRun = false;
  let retryOnLimit = false;
  let maxLimitRetries = 12;
  let maxTransientRetries = 2;
  let keepAwake = false;
  let resumePath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--spec":
        specs.push(args[++i]);
        break;
      case "--model":
        models.push(args[++i]);
        break;
      case "--eval-model":
        evalModel = args[++i];
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--retry-on-limit":
        retryOnLimit = true;
        break;
      case "--max-limit-retries":
        maxLimitRetries = Number(args[++i]);
        break;
      case "--max-transient-retries":
        maxTransientRetries = Number(args[++i]);
        break;
      case "--max-budget-usd":
        budgetOverrideUsd = args[++i];
        break;
      case "--keep-awake":
        keepAwake = true;
        break;
      case "--resume":
        resumePath = resolve(args[++i]);
        break;
      case "--help":
        console.log(`Usage: node runner/run.ts [options]

Options:
  --spec <id>          Spec to run (repeatable). Default: all specs.
  --model <name>       Model to test (repeatable). Default: ${DEFAULT_MODELS.join(", ")}.
                       CLI backend is deduced from the model name.
  --eval-model <name>  Model for evaluation. Default: ${DEFAULT_EVAL_MODEL}.
  --dry-run            Show what would run without executing.
  --retry-on-limit     On a usage-limit failure, wait for the window to refill
                       (honouring the provider's reset time when given, else
                       ~5h) and retry the same spec. Scores are written
                       incrementally so progress survives a kill. Intended for
                       long unattended runs (e.g. effort=max across all specs).
  --max-limit-retries <n>  Max consecutive waits per spec before giving up on
                       it. Default: 12.
  --max-transient-retries <n>  Immediate retries for a NON-limit failure
                       (e.g. a connection broken by the host sleeping, a
                       timeout, an unparseable evaluation) before recording it.
                       Short backoff between tries. Default: 2.
  --max-budget-usd <n> Override the per-implementation spend cap. Default scales
                       by effort: ${MAX_BUDGET_USD_DEFAULT} normally, ${MAX_BUDGET_USD_MAX_EFFORT} for effort=max
                       (max effort on heavy specs blows a flat $5 mid-run).
  --keep-awake         Hold the Windows host awake for the duration (WSL only,
                       via SetThreadExecutionState). Blocks idle-sleep; does NOT
                       block lid-close sleep. No-op off WSL. Reverts on exit.
  --resume <file>      Append to an existing scores JSON, skipping any spec that
                       already has a non-null weighted_score. Combine with
                       --retry-on-limit to continue a run after a restart.
  --help               Show this help.

Available models:
  ${Object.entries(MODEL_REGISTRY).map(([name, spec]) => `${name.padEnd(20)} (${spec.backend})`).join("\n  ")}

Examples:
  node runner/run.ts
  node runner/run.ts --spec 001-event-registration-form --model sonnet
  node runner/run.ts --model gpt-4.1
  node runner/run.ts --model gpt-5.6-luna-high
  node runner/run.ts --model gpt-4.1 --model sonnet --model gemini-3-pro-preview
`);
        process.exit(0);
    }
  }

  // Validate all models upfront
  for (const m of models) resolveModel(m);
  resolveModel(evalModel);

  return {
    specs: specs.length > 0 ? specs : listSpecs(),
    models: models.length > 0 ? models : DEFAULT_MODELS,
    evalModel,
    dryRun,
    retryOnLimit,
    maxLimitRetries,
    maxTransientRetries,
    keepAwake,
    resumePath,
  };
}

async function runSingle(specId: string, model: string, evalModel: string): Promise<RunResult> {
  const timestamp = new Date().toISOString();
  log(`Starting: spec=${specId} model=${model}`);

  // Setup working directory in the sandbox (outside the repo).
  const { workDir, archiveDir } = setupWorkDir(specId, model);
  log(`  Sandbox: ${workDir}`);
  log(`  Archive: ${archiveDir}`);

  try {
    // Phase 1: Implementation
    const impl = await runImplementation(specId, model, workDir);

    // Archive whatever the agent produced, even if the implementation failed,
    // so we can inspect partial output afterwards.
    archiveRun(workDir, archiveDir);

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
        failure: impl.failure ?? { kind: "other", resetAt: null },
        archiveDir,
      };
    }

    // Phase 2: Evaluation
    const eval_ = await runEvaluation(specId, impl.files, evalModel);

    return {
      spec: specId,
      model,
      timestamp,
      compiles: impl.compiles,
      implementedFiles: impl.files,
      evaluation: eval_.result,
      evaluationError: eval_.error,
      implementationError: null,
      failure: eval_.result ? null : eval_.failure,
      archiveDir,
    };
  } finally {
    // Always clean up the sandbox — its node_modules is large and the source
    // has already been archived to archiveDir.
    cleanupWorkDir(workDir);
  }
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
  console.log(`Eval:   ${config.evalModel}`);
  console.log(`Total runs: ${matrix.length}`);
  console.log();

  if (config.dryRun) {
    console.log("Dry run — would execute:");
    for (const { spec, model } of matrix) {
      console.log(`  ${spec} × ${model}`);
    }
    return;
  }

  // Ensure results + scores directories exist.
  mkdirSync(RESULTS_DIR, { recursive: true });
  mkdirSync(SCORES_DIR, { recursive: true });

  // The scores file is the source of truth for progress: it is written after
  // every spec (not just at the end) so a kill mid-run — or a usage-limit wait
  // that never returns — never loses completed work. When resuming, we load it
  // and append, skipping specs that already carry a score. The stamp matches
  // the previous behaviour; the user can rename to a meaningful label before
  // committing (scores/ is tracked in git).
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16); // YYYY-MM-DDTHH-MM
  const specsLabel = config.specs.length === 1 ? config.specs[0] : "multi";
  const scoresPath = config.resumePath ?? join(SCORES_DIR, `${specsLabel}_${stamp}.json`);

  const summary: SummaryRow[] = [];
  if (config.resumePath && existsSync(config.resumePath)) {
    try {
      const prior = JSON.parse(readFileSync(config.resumePath, "utf-8")) as SummaryRow[];
      summary.push(...prior);
      log(`Resuming from ${config.resumePath} (${prior.filter((r) => r.weighted_score != null).length} specs already scored)`);
    } catch (e) {
      console.error(`Could not read --resume file ${config.resumePath}: ${e instanceof Error ? e.message : String(e)}`);
      process.exit(1);
    }
  }

  const hasScore = (spec: string, model: string) =>
    summary.some((r) => r.spec === spec && r.model === model && r.weighted_score != null);

  const persist = () => writeFileSync(scoresPath, JSON.stringify(summary, null, 2));
  const upsert = (row: SummaryRow) => {
    const idx = summary.findIndex((r) => r.spec === row.spec && r.model === row.model);
    if (idx >= 0) summary[idx] = row; else summary.push(row);
    persist();
  };

  const results: RunResult[] = []; // detailed results produced this session

  // Keep the laptop awake for the whole run (released in the finally below).
  const releaseKeepAwake = config.keepAwake ? startKeepAwake() : () => {};
  try {

  for (const { spec, model } of matrix) {
    if (hasScore(spec, model)) {
      log(`Skipping ${spec} × ${model} — already scored`);
      continue;
    }

    // Run the combo with two independent recovery paths:
    //  - a usage limit waits out the 5h window and retries (capped);
    //  - any other (non-fatal) failure is treated as transient — most often a
    //    connection broken by the laptop suspending mid-call — and retried
    //    immediately after a short backoff (capped);
    //  - a fatal auth/credit error aborts, since neither waiting nor retrying
    //    can fix it.
    let limitWaits = 0;
    let transientRetries = 0;
    while (true) {
      const result = await runSingle(spec, model, config.evalModel);
      results.push(result);
      console.log();

      if (result.evaluation) { upsert(summaryRow(result)); break; }

      const kind = result.failure?.kind ?? "other";
      if (kind === "fatal") {
        upsert(summaryRow(result));
        console.error(`Fatal error on ${spec} × ${model} (auth/credit) — cannot be fixed by waiting. Aborting.`);
        process.exit(1);
      }

      // Budget cap exceeded mid-run: deterministic at this budget+effort, so
      // neither a transient retry nor a usage-limit wait can help — only a
      // higher --max-budget-usd. Record it and move on so the rest of the
      // matrix still runs; a later --resume with a raised cap retries it.
      if (kind === "budget") {
        log(`  ${spec} × ${model}: exceeded the --max-budget-usd cap (${budgetForSpec(resolveModel(model))}) mid-run. ` +
          `Deterministic at this budget+effort — not retrying. Raise --max-budget-usd and re-run with --resume.`);
        upsert(summaryRow(result));
        break;
      }

      // Decide whether this is a usage limit. Text-matched limits are taken at
      // face value; for everything else we probe the account directly. The CLI
      // gives us nothing reliable to match on — a limit may surface with empty
      // output OR with a partial line printed before it died mid-call (observed:
      // a spec ran 12 min, then the limit hit and it failed with partial
      // output). So probe on ANY non-limit failure, not just the empty-output
      // signature — otherwise a limit-with-output is mistaken for transient and
      // the run burns retries/passes fast-failing instead of waiting it out.
      let isLimit = kind === "rate_limit";
      if (config.retryOnLimit && !isLimit) {
        log(`  ${spec}: non-limit failure — probing account for a usage limit...`);
        isLimit = await probeRateLimit(resolveModel(model));
        log(`  Probe: ${isLimit ? "usage limit IS active — will wait" : "not limited — treating as transient"}`);
      }

      if (isLimit) {
        if (config.retryOnLimit && limitWaits < config.maxLimitRetries) {
          limitWaits++;
          log(`  Usage limit on ${spec} × ${model} (wait ${limitWaits}/${config.maxLimitRetries}).`);
          await waitForReset(result.failure?.resetAt ?? null, resolveModel(model));
          continue; // retry the same combo with a fresh window
        }
        if (config.retryOnLimit) log(`  Giving up on ${spec} × ${model} after ${limitWaits} limit waits.`);
        upsert(summaryRow(result));
        break;
      }

      // Non-limit failure: self-heal with a few immediate retries (covers
      // sleep-broken connections, transient network errors, a flaky eval parse).
      if (transientRetries < config.maxTransientRetries) {
        transientRetries++;
        log(`  ${spec} × ${model} failed (non-limit) — transient retry ${transientRetries}/${config.maxTransientRetries} in ${TRANSIENT_BACKOFF_MS / 1000}s.`);
        await sleep(TRANSIENT_BACKOFF_MS);
        continue;
      }
      log(`  Giving up on ${spec} × ${model} after ${transientRetries} transient retries.`);
      upsert(summaryRow(result));
      break;
    }
  }

  } finally {
    releaseKeepAwake();
  }

  // Mirror the final scores into results/ for archival, matching prior behaviour.
  const summaryPath = join(RESULTS_DIR, `summary_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`);
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  log(`Summary written to ${summaryPath}`);
  log(`Scores written to ${scoresPath}`);

  // --- Write per-run detailed results alongside the archived source ---
  for (const r of results) {
    if (r.evaluation && existsSync(r.archiveDir)) {
      writeFileSync(
        join(r.archiveDir, "evaluation-result.json"),
        JSON.stringify(r.evaluation, null, 2),
      );
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
      const r = summary.find((r) => r.spec === spec && r.model === model);
      if (!r) return "—".padStart(modelColWidth);
      if (r.weighted_score != null) return String(r.weighted_score).padStart(modelColWidth);
      if (r.error) return "ERR".padStart(modelColWidth);
      return "N/A".padStart(modelColWidth);
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

// Only run the benchmark when invoked directly; importing this module (e.g.
// from a test) should not kick off a full run.
if (import.meta.main) {
  main().catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  });
}
