function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv<T extends Record<string, unknown>>(rows: T[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const keys = columns || Object.keys(rows[0]);
  const header = keys.map(escapeCsv).join(",");
  const body = rows.map((row) => keys.map((k) => escapeCsv(row[k])).join(",")).join("\n");
  return `${header}\n${body}`;
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCsv<T extends Record<string, unknown>>(
  rows: T[],
  filename: string,
  columns?: string[]
) {
  const csv = toCsv(rows, columns);
  downloadCsv(csv, filename);
}
