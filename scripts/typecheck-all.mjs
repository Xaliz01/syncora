import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const roots = ["apps", "services", "packages"];
const workspaces = [];

for (const root of roots) {
  if (!existsSync(root)) continue;
  for (const name of readdirSync(root, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const dir = join(root, name.name);
    const pkgPath = join(dir, "package.json");
    const tsconfigPath = join(dir, "tsconfig.json");
    if (!existsSync(pkgPath) || !existsSync(tsconfigPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    workspaces.push({ dir, name: pkg.name ?? name.name });
  }
}

workspaces.sort((a, b) => a.name.localeCompare(b.name));

for (const { dir, name } of workspaces) {
  console.log(`\n>>> Typecheck ${name}`);
  execSync("npx tsc -p tsconfig.json --noEmit", { cwd: dir, stdio: "inherit" });
}

console.log(`\nTypecheck OK (${workspaces.length} workspaces).`);
