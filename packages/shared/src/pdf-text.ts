/** Sanitize PDF text for PDFKit standard fonts (WinAnsi / Helvetica). */

/**
 * PDFKit mappe mal certains Unicode hors WinAnsi en écrivant le codepoint
 * en hex (ex. ○ U+25CB → octets 0x25 0xCB = « %Ë » à l'écran).
 * On remplace les symboles courants + tout caractère hors WinAnsi.
 */
const PDF_UNICODE_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ["○", "[ ]"],
  ["●", "*"],
  ["✓", "[x]"],
  ["✔", "[x]"],
  ["✗", "[ ]"],
  ["✘", "[ ]"],
  ["→", "->"],
  ["←", "<-"],
  ["⇒", "=>"],
  ["…", "..."],
  ["\u2022", "-"], // bullet
  ["\u00B7", "-"], // middle dot
];

/** Caractères WinAnsi / Windows-1252 hors Latin-1 (souvent utilisés en FR). */
const WINANSI_EXTRA = "€‚ƒ„†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

const WINANSI_SAFE = new Set<string>([
  ..."\t\n\r",
  ...Array.from({ length: 0x7f - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i)),
  ...Array.from({ length: 0xff - 0xa0 + 1 }, (_, i) => String.fromCharCode(0xa0 + i)),
  ...WINANSI_EXTRA,
]);

export function sanitizePdfText(value: string | number | null | undefined): string {
  let text = value == null ? "" : String(value);
  for (const [from, to] of PDF_UNICODE_REPLACEMENTS) {
    if (text.includes(from)) text = text.split(from).join(to);
  }
  let out = "";
  for (const ch of text) {
    out += WINANSI_SAFE.has(ch) ? ch : "?";
  }
  return out;
}
