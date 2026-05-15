import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const FORMATTED_EXT = /\.(ts|tsx|json|md|yml|yaml)$/;

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

const eventName = process.env.GITHUB_EVENT_NAME;
const baseRef = process.env.GITHUB_BASE_REF;
const prBaseSha = process.env.GITHUB_PR_BASE_SHA;
const prHeadSha = process.env.GITHUB_PR_HEAD_SHA;
const before = process.env.GITHUB_BEFORE_SHA;
const head = process.env.GITHUB_SHA ?? "HEAD";

function ensureCommit(sha) {
  try {
    run(`git cat-file -e ${sha}^{commit}`);
  } catch {
    run(`git fetch origin ${sha} --depth=1`);
  }
}

let diffRange;
if (eventName === "pull_request" && prBaseSha && prHeadSha) {
  ensureCommit(prBaseSha);
  ensureCommit(prHeadSha);
  diffRange = `${prBaseSha}...${prHeadSha}`;
} else if (eventName === "pull_request" && baseRef) {
  run(`git fetch origin ${baseRef} --depth=50`);
  diffRange = `origin/${baseRef}...${head}`;
} else if (before && before !== "0000000000000000000000000000000000000000") {
  diffRange = `${before}...${head}`;
} else {
  console.log("No diff base — skipping Prettier (first commit or missing context).");
  process.exit(0);
}

let namesRaw;
try {
  namesRaw = run(`git diff --name-only --diff-filter=ACMRTUXB ${diffRange}`);
} catch (err) {
  console.error(`git diff failed for ${diffRange}:`, err.stderr?.toString() ?? err.message);
  process.exit(1);
}

const names = namesRaw
  .split("\n")
  .map((f) => f.trim())
  .filter((f) => f && FORMATTED_EXT.test(f) && existsSync(f));

if (names.length === 0) {
  console.log("No formattable files changed.");
  process.exit(0);
}

console.log(`Prettier check on ${names.length} file(s)…`);
execSync(`npx prettier --check ${names.map((f) => JSON.stringify(f)).join(" ")}`, {
  stdio: "inherit"
});
