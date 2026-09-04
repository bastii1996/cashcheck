// PostToolUse hook (Write|Edit) — per-edit quality layer (m3l3).
// Fast signal after every agent edit:
//   1. prettier --write on the edited file, so formatting never reaches a commit dirty
//   2. vitest related --run, only for files inside test-plan risk areas
// Exit 0 = quiet success; exit 2 + stderr = blocking feedback the agent must act on.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { relative } from "node:path";

// additionalContext is capped at 10k chars — leave headroom for the header.
const OUTPUT_LIMIT = 9000;

// Risk areas per test-plan §2/§5: parser + API service logic and the test suite itself.
const RISK_AREAS = [/^src\/lib\/services\//, /^src\/pages\/api\//, /^test\//];
const PRETTIER_EXTENSIONS = /\.(ts|tsx|astro|css|json|md|mjs|cjs|js)$/;

function fail(header, output) {
  process.stderr.write(`${header}\n${output}`.slice(0, OUTPUT_LIMIT));
  process.exit(2);
}

function run(command) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60_000 });
}

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path ?? input?.tool_response?.filePath;
if (typeof filePath !== "string" || filePath.length === 0) {
  process.exit(0);
}

const rel = relative(process.cwd(), filePath).replaceAll("\\", "/");
// Outside the repo, or generated/vendor content — not ours to check.
if (rel.startsWith("..") || /(^|\/)(node_modules|dist|\.astro|\.wrangler)\//.test(rel)) {
  process.exit(0);
}

if (PRETTIER_EXTENSIONS.test(rel)) {
  try {
    run(`npx prettier --write "${filePath}"`);
  } catch (error) {
    fail(
      `prettier nie przeszedł na ${rel} (zwykle błąd składni):`,
      String(error.stderr ?? error.message ?? error),
    );
  }
}

if (!RISK_AREAS.some((area) => area.test(rel)) || !/\.(ts|tsx)$/.test(rel)) {
  process.exit(0);
}

// A test file runs itself; a source file runs the tests that import it.
const vitestCommand = /\.test\.ts$/.test(rel)
  ? `npx vitest run "${filePath}"`
  : `npx vitest related "${filePath}" --run`;
try {
  run(vitestCommand);
} catch (error) {
  fail(
    `Testy powiązane z ${rel} nie przechodzą (uruchomiono: ${vitestCommand}). Napraw zanim pójdziesz dalej:`,
    `${String(error.stdout ?? "")}${String(error.stderr ?? "")}`,
  );
}
process.exit(0);
