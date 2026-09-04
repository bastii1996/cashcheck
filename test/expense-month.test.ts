import { describe, expect, it } from "vitest";
import { currentMonthWindow, isInCurrentMonth } from "@/lib/services/expense-month";

// Regresja dla fix-month-window (m3l5): widok „Ten miesiąc" pokazuje wyłącznie
// wydatki bieżącego miesiąca kalendarzowego [PRD FR-007]. Oczekiwania spisane
// z wymagania, nie z kodu; „dziś" wstrzykiwane parametrem — bez zamrażania zegara.

describe("currentMonthWindow — okno bieżącego miesiąca (FR-007)", () => {
  it("liczy okno w środku roku [FR-007: miesiąc kalendarzowy]", () => {
    expect(currentMonthWindow("2026-09-04")).toEqual({ monthStart: "2026-09-01", nextMonthStart: "2026-10-01" });
  });

  it("przechodzi przełom roku: grudzień → styczeń [FR-007]", () => {
    expect(currentMonthWindow("2026-12-31")).toEqual({ monthStart: "2026-12-01", nextMonthStart: "2027-01-01" });
  });
});

describe("isInCurrentMonth — przynależność wydatku do widoku (FR-007)", () => {
  it.each([
    ["2026-09-01", "pierwszy dzień miesiąca"],
    ["2026-09-30", "ostatni dzień miesiąca"],
  ])("przyjmuje %s (%s)", (date) => {
    expect(isInCurrentMonth(date, "2026-09-04")).toBe(true);
  });

  it.each([
    ["2026-08-15", "15. poprzedniego miesiąca [reprodukcja buga: taki zapis pojawiał się w widoku]"],
    ["2026-08-31", "ostatni dzień poprzedniego miesiąca"],
    ["2026-10-01", "pierwszy dzień następnego miesiąca"],
    ["2025-09-04", "ten sam miesiąc rok wcześniej [porównanie stringów musi uwzględniać rok]"],
  ])("odrzuca %s (%s)", (date) => {
    expect(isInCurrentMonth(date, "2026-09-04")).toBe(false);
  });

  it("w styczniu odrzuca grudzień poprzedniego roku [FR-007: przełom roku]", () => {
    expect(isInCurrentMonth("2026-12-31", "2027-01-02")).toBe(false);
    expect(isInCurrentMonth("2027-01-01", "2027-01-02")).toBe(true);
  });
});
