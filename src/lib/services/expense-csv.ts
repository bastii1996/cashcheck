// CSV writer for the month export (research export-month-csv: Polish Excel
// wants UTF-8 with BOM, semicolon separator, CRLF and comma decimals).
// Pure module — imported by an API route and unit tests; no server-only APIs.
import type { Expense } from "@/types";

const BOM = "\uFEFF";
const SEPARATOR = ";";
const HEADER = ["Data", "Kategoria", "Opis", "Kwota"].join(SEPARATOR);

/** Quote a field when it carries the separator, quotes or newlines; double inner quotes. */
function escapeCsvField(value: string): string {
  if (value.includes(SEPARATOR) || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

/** Amount as a plain Polish-locale number (12,34) — no currency suffix, Excel reads it as a number. */
function formatAmount(amount: number): string {
  return amount.toFixed(2).replace(".", ",");
}

/** Whole file content for the current-month export; starts with a BOM so Excel detects UTF-8. */
export function toMonthCsv(expenses: Expense[]): string {
  const rows = expenses.map((e) =>
    [e.expense_date, escapeCsvField(e.category), escapeCsvField(e.description), formatAmount(e.amount)].join(SEPARATOR),
  );
  return `${BOM}${[HEADER, ...rows].join("\r\n")}\r\n`;
}
