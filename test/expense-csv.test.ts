import { describe, expect, it } from "vitest";
import { toMonthCsv } from "@/lib/services/expense-csv";
import type { Expense } from "@/types";

// Testy eksportu CSV (zmiana export-month-csv). Wyrocznia: wymagania polskiego
// Excela z badań zewnętrznych (UTF-8 z BOM, separator ";", CRLF, kwoty z
// przecinkiem, cytowanie RFC-4180) — nie implementacja.

function expense(overrides: Partial<Expense>): Expense {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    user_id: "u",
    amount: 87.5,
    category: "Żywność",
    expense_date: "2026-09-04",
    description: "biedronka",
    created_at: "2026-09-04T10:00:00Z",
    ...overrides,
  };
}

describe("toMonthCsv — plik dla polskiego Excela", () => {
  it("zaczyna się od BOM, żeby Excel rozpoznał UTF-8 [badania zewnętrzne: BOM]", () => {
    expect(toMonthCsv([]).startsWith("﻿")).toBe(true);
  });

  it("pusta lista daje sam nagłówek ze średnikami i CRLF [separator ';' dla locale PL]", () => {
    expect(toMonthCsv([])).toBe("﻿Data;Kategoria;Opis;Kwota\r\n");
  });

  it("kwotę zapisuje z przecinkiem dziesiętnym i dwoma miejscami, bez waluty [przecinek = separator dziesiętny PL]", () => {
    const csv = toMonthCsv([expense({ amount: 87.5 })]);
    expect(csv).toContain(";87,50\r\n");
    expect(csv).not.toContain("zł");
  });

  it("polskie znaki w kategorii przechodzą bez zmian [incydent UTF-8 przy smoke S-01]", () => {
    expect(toMonthCsv([expense({ category: "Żywność" })])).toContain(";Żywność;");
  });

  it("opis ze średnikiem trafia w cudzysłów [pole z separatorem musi być cytowane]", () => {
    const csv = toMonthCsv([expense({ description: "obiad; deser" })]);
    expect(csv).toContain(';"obiad; deser";');
  });

  it("cudzysłów w opisie jest podwajany wewnątrz cytowania [RFC 4180]", () => {
    const csv = toMonthCsv([expense({ description: 'sklep "U Zosi"' })]);
    expect(csv).toContain(';"sklep ""U Zosi""";');
  });

  it("wiersz niesie datę ISO, kategorię, opis i kwotę w tej kolejności [nagłówek Data;Kategoria;Opis;Kwota]", () => {
    const csv = toMonthCsv([expense({})]);
    expect(csv).toContain("2026-09-04;Żywność;biedronka;87,50\r\n");
  });
});
