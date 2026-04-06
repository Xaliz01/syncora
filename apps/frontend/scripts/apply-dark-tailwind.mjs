/**
 * Ajoute des variantes Tailwind dark: aux classNames (usage ponctuel).
 * Exclut les fichiers déjà traités à la main.
 *
 * Après exécution : supprimer les doublons `dark:text-slate-400 dark:text-slate-500`
 * (le remplacement de text-slate-400 matche aussi le suffixe de dark:text-slate-400),
 * et remplacer `hover:bg-slate-50 dark:bg-slate-950` par `hover:bg-slate-50 dark:hover:bg-slate-800`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SKIP = new Set([
  "components/theme/ThemeToggle.tsx",
  "components/theme/ThemeProvider.tsx",
  "components/ui/list-page.tsx",
  "components/layout/AppShell.tsx"
]);

/** (pattern, replacement) — remplacements sûrs si le fichier ne contient pas déjà dark: partout */
const RULES = [
  [/bg-white\/95(?!\s+dark:)/g, "bg-white/95 dark:bg-slate-900/95"],
  [/bg-white\/80(?!\s+dark:)/g, "bg-white/80 dark:bg-slate-900/80"],
  [/border-slate-300(?!\s+dark:)/g, "border-slate-300 dark:border-slate-600"],
  [/border-slate-200(?!\s+dark:)/g, "border-slate-200 dark:border-slate-700"],
  [/border-slate-100(?!\s+dark:)/g, "border-slate-100 dark:border-slate-800"],
  [/bg-slate-50(?!\s+dark:)/g, "bg-slate-50 dark:bg-slate-950"],
  [/bg-slate-100(?!\s+dark:)/g, "bg-slate-100 dark:bg-slate-800"],
  [/placeholder:text-slate-400(?!\s+dark:)/g, "placeholder:text-slate-400 dark:placeholder:text-slate-500"],
  [/text-slate-900(?!\s+dark:)/g, "text-slate-900 dark:text-slate-100"],
  [/text-slate-800(?!\s+dark:)/g, "text-slate-800 dark:text-slate-100"],
  [/text-slate-700(?!\s+dark:)/g, "text-slate-700 dark:text-slate-200"],
  [/text-slate-600(?!\s+dark:)/g, "text-slate-600 dark:text-slate-300"],
  [/text-slate-500(?!\s+dark:)/g, "text-slate-500 dark:text-slate-400"],
  [/text-slate-400(?!\s+dark:)/g, "text-slate-400 dark:text-slate-500"],
  [/hover:bg-slate-50(?!\s+dark:)/g, "hover:bg-slate-50 dark:hover:bg-slate-800"],
  [/hover:bg-slate-100(?!\s+dark:)/g, "hover:bg-slate-100 dark:hover:bg-slate-800"],
  [/hover:text-slate-900(?!\s+dark:)/g, "hover:text-slate-900 dark:hover:text-slate-100"],
  [/hover:text-slate-800(?!\s+dark:)/g, "hover:text-slate-800 dark:hover:text-slate-100"],
  [/hover:text-slate-700(?!\s+dark:)/g, "hover:text-slate-700 dark:hover:text-slate-200"],
  [/focus:bg-white(?!\s+dark:)/g, "focus:bg-white dark:focus:bg-slate-900"],
  [/\bbg-white(?!\s+dark:bg-slate-900)(?=[\s"'\`])/g, "bg-white dark:bg-slate-900"],
  [/text-brand-600(?!\s+dark:)/g, "text-brand-600 dark:text-brand-400"],
  [/text-brand-700(?!\s+dark:)/g, "text-brand-700 dark:text-brand-400"],
  [/border-dashed border-slate-300(?!\s+dark:)/g, "border-dashed border-slate-300 dark:border-slate-600"],
  [/shadow-sm(?!\s+dark:)/g, "shadow-sm dark:shadow-slate-950/20"]
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

let changed = 0;
const targets = [path.join(ROOT, "app"), path.join(ROOT, "components")].filter((d) => fs.existsSync(d));
const files = targets.flatMap((d) => walk(d));
for (const abs of files) {
  const rel = path.relative(ROOT, abs).split(path.sep).join("/");
  if (SKIP.has(rel)) continue;
  let s = fs.readFileSync(abs, "utf8");
  if (!s.includes("className")) continue;
  const orig = s;
  for (const [re, rep] of RULES) {
    s = s.replace(re, rep);
  }
  if (s !== orig) {
    fs.writeFileSync(abs, s);
    changed++;
  }
}
console.log("Updated", changed, "files");
