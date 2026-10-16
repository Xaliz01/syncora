/**
 * Prochain tag SemVer `vX.Y.Z` à partir des tags git et d'un incrément.
 * Utilisé par la CD (`.github/workflows/cd.yml`).
 *
 *   node scripts/next-version.mjs <major|minor|patch>
 */
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const SEMVER_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

export function parseSemverTag(tag) {
  const match = SEMVER_TAG.exec(String(tag).trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/** Plus grand tag `vX.Y.Z` parmi la liste. Les autres formes sont ignorées. */
export function latestSemver(tags) {
  let best = null;
  for (const tag of tags) {
    const parsed = parseSemverTag(tag);
    if (!parsed) continue;
    if (!best || compareSemver(parsed, best) > 0) best = parsed;
  }
  return best;
}

export function formatSemver(version) {
  return `v${version.major}.${version.minor}.${version.patch}`;
}

/**
 * @param {{ major: number, minor: number, patch: number } | null} current
 * @param {"major" | "minor" | "patch"} bump
 */
export function bumpVersion(current, bump) {
  if (bump !== "major" && bump !== "minor" && bump !== "patch") {
    throw new Error(`Incrément inconnu : ${bump}`);
  }
  if (!current) {
    if (bump === "major") return { major: 1, minor: 0, patch: 0 };
    if (bump === "minor") return { major: 0, minor: 1, patch: 0 };
    return { major: 0, minor: 0, patch: 1 };
  }
  if (bump === "major") return { major: current.major + 1, minor: 0, patch: 0 };
  if (bump === "minor") return { major: current.major, minor: current.minor + 1, patch: 0 };
  return { major: current.major, minor: current.minor, patch: current.patch + 1 };
}

export function nextVersionFromTags(tags, bump) {
  return formatSemver(bumpVersion(latestSemver(tags), bump));
}

export function listGitSemverTags() {
  const output = execFileSync("git", ["tag", "--list", "v*.*.*"], { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isCli() {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
}

if (isCli()) {
  const bump = process.argv[2];
  const tags = process.argv[3] === undefined ? listGitSemverTags() : process.argv.slice(3);
  process.stdout.write(`${nextVersionFromTags(tags, bump)}\n`);
}
