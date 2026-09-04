import { describe, expect, it } from "vitest";
import { expensePayloadSchema } from "@/lib/services/expense-schema";
import { todayInWarsaw } from "@/lib/services/expense-parser";

// Tests for risk #5 (test-plan §2): the save schema rejects impossible or
// out-of-window data with a clean 4xx-shaped result and accepts valid PLN
// expenses. Expected outcomes come from requirements (impl-review F3,
// PRD FR-003, the parser's documented -1…366-day window) — not from code.

function shiftDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

const valid = () => ({
  amount: 10,
  category: "Żywność" as const,
  expense_date: todayInWarsaw(),
  description: "test",
});

describe("expensePayloadSchema — walidacja zapisu (ryzyko #5)", () => {
  it.each([
    ["2026-13-45", "nieistniejący miesiąc/dzień [impl-review F3: wcześniej kończyło się 500 z bazy]"],
    ["2026-02-31", "nieistniejący dzień lutego [impl-review F3]"],
    ["2099-01-01", "rok daleko poza oknem [okno -1…366 dni]"],
  ])("odrzuca datę %s — %s", (expense_date) => {
    expect(expensePayloadSchema.safeParse({ ...valid(), expense_date }).success).toBe(false);
  });

  it("odrzuca datę pojutrze [okno dopuszcza najdalej jutro]", () => {
    const result = expensePayloadSchema.safeParse({ ...valid(), expense_date: shiftDays(todayInWarsaw(), 2) });
    expect(result.success).toBe(false);
  });

  it.each([
    [-1, "wczoraj"],
    [0, "dziś"],
    [1, "jutro"],
  ])("przyjmuje datę przesuniętą o %i dni (%s) [okno -1…366 dni]", (days) => {
    const result = expensePayloadSchema.safeParse({ ...valid(), expense_date: shiftDays(todayInWarsaw(), days) });
    expect(result.success).toBe(true);
  });

  it.each([
    [0, "zero [PRD: kwota wydatku jest dodatnia — check amount > 0 w kontrakcie S-01]"],
    [-5, "ujemna"],
    [100_001, "powyżej limitu 100 000 [kontrakt planu S-01]"],
  ])("odrzuca kwotę %s — %s", (amount) => {
    expect(expensePayloadSchema.safeParse({ ...valid(), amount }).success).toBe(false);
  });

  it("przyjmuje kwoty graniczne 0.01 i 100000 [kontrakt planu S-01]", () => {
    expect(expensePayloadSchema.safeParse({ ...valid(), amount: 0.01 }).success).toBe(true);
    expect(expensePayloadSchema.safeParse({ ...valid(), amount: 100_000 }).success).toBe(true);
  });

  it("odrzuca kategorię spoza ustalonego zestawu [PRD: 8 stałych kategorii]", () => {
    expect(expensePayloadSchema.safeParse({ ...valid(), category: "Kryptowaluty" }).success).toBe(false);
  });

  it("przyjmuje kategorię z polskimi znakami w UTF-8 [incydent kodowania przy smoke S-01]", () => {
    expect(expensePayloadSchema.safeParse({ ...valid(), category: "Żywność" }).success).toBe(true);
  });

  it("odrzuca pusty opis i opis dłuższy niż 300 znaków [kontrakt planu S-01: opis 1–300]", () => {
    expect(expensePayloadSchema.safeParse({ ...valid(), description: "  " }).success).toBe(false);
    expect(expensePayloadSchema.safeParse({ ...valid(), description: "x".repeat(301) }).success).toBe(false);
  });
});
