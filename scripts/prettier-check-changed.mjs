import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const FORMATTED_EXT = /\.(ts|tsx|json|md|yml|yaml)$/;

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

const eventName = process.env.GITHUB_EVENT_NAME;
const baseRef = process.env.GITHUB_BASE_REF;
const before = process.env.GITHUB_BEFORE_SHA;
const head = process.env.GITHUB_SHA ?? "HEAD";

let diffRange;
if (eventName === "pull_request" && baseRef) {
  run(`git fetch origin ${baseRef} --depth=1`);
  diffRange = `origin/${baseRef}...${head}`;
} else if (before && before !== "0000000000000000000000000000000000000000") {
  diffRange = `${before}...${head}`;
} else {
  console.log("No diff base — skipping Prettier (first commit or missing context).");
  process.exit(0);
}

const names = run(`git diff --name-only --diff-filter=ACMRTUXB ${diffRange}`)
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
