export function inspectCurl(origin: string, url: string): string {
  const payload = JSON.stringify({ url });
  return `curl -sS -X POST ${origin}/api/inspect \\\n  -H 'content-type: application/json' \\\n  -d '${payload.replace(/'/g, `'\\''`)}'`;
}

export function downloadText(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}
