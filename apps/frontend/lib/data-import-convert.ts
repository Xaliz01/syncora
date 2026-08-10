/** Parse CSV client-side for « Convertir mon export » (détecte ; ou ,). */

function detectSeparator(headerLine: string): ";" | "," {
  const semis = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semis >= commas ? ";" : ",";
}

function splitCsvLine(line: string, separator: ";" | ","): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === separator && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

export function parseFlexibleCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
  separator: ";" | ",";
} {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [], separator: ";" };
  }
  const separator = detectSeparator(lines[0]!);
  const headers = splitCsvLine(lines[0]!, separator).filter(Boolean);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]!, separator);
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c += 1) {
      row[headers[c]!] = cells[c] ?? "";
    }
    rows.push(row);
  }
  return { headers, rows, separator };
}

export function applyMappingToRows(
  rows: Record<string, string>[],
  mapping: Record<string, string | null>,
  targetKeys: string[],
): Record<string, string>[] {
  return rows.map((src) => {
    const out: Record<string, string> = {};
    for (const key of targetKeys) {
      const source = mapping[key];
      out[key] = source ? (src[source] ?? "").trim() : "";
    }
    return out;
  });
}

export function buildPlanwiseCsv(targetKeys: string[], rows: Record<string, string>[]): string {
  const escape = (v: string) => {
    if (/[;"\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  const lines = [targetKeys.join(";")];
  for (const row of rows) {
    lines.push(targetKeys.map((k) => escape(row[k] ?? "")).join(";"));
  }
  return lines.join("\n");
}

/** Découpe les lignes pour respecter la limite d’import Planwise. */
export function chunkRows<T>(rows: T[], maxRows: number): T[][] {
  if (maxRows <= 0) return [rows];
  if (rows.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += maxRows) {
    chunks.push(rows.slice(i, i + maxRows));
  }
  return chunks;
}

/**
 * Génère un ou plusieurs CSV Planwise (en-tête répété sur chaque partie).
 * Ex. `planwise-dossiers.csv` → `planwise-dossiers-partie-1-sur-3.csv` …
 */
export function buildPlanwiseCsvParts(
  targetKeys: string[],
  rows: Record<string, string>[],
  options: { baseFilename: string; maxRows: number },
): Array<{ filename: string; content: string; rowCount: number }> {
  const chunks = chunkRows(rows, options.maxRows);
  if (chunks.length <= 1) {
    const only = chunks[0] ?? [];
    return [
      {
        filename: options.baseFilename,
        content: buildPlanwiseCsv(targetKeys, only),
        rowCount: only.length,
      },
    ];
  }
  const base = options.baseFilename.replace(/\.csv$/i, "");
  return chunks.map((chunk, i) => ({
    filename: `${base}-partie-${i + 1}-sur-${chunks.length}.csv`,
    content: buildPlanwiseCsv(targetKeys, chunk),
    rowCount: chunk.length,
  }));
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8",
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Téléchargements successifs (les navigateurs bloquent souvent les clics simultanés). */
export async function downloadTextFiles(
  files: Array<{ filename: string; content: string }>,
  delayMs = 450,
): Promise<void> {
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i]!;
    downloadTextFile(file.filename, file.content);
    if (i < files.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
