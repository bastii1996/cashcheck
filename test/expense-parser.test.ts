import { describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { parseExpenseSentence, todayInWarsaw } from "@/lib/services/expense-parser";

// Golden tests for risk #1 (test-plan §2). Every expected value below is
// written from the REQUIREMENTS (PRD, US-01, test-plan Risk Response #1) —
// never derived from the implementation (oracle problem, test-plan §2).

/** Date-only arithmetic on ISO strings (UTC-safe for calendar math). */
function shiftDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

function modelReturns(response: unknown) {
  env.AI.run = vi.fn().mockResolvedValue({ response });
}

describe("parseExpenseSentence — kontrakt propozycji (ryzyko #1)", () => {
  it("mapuje pełną odpowiedź modelu na propozycję z dzisiejszą datą domyślną [US-01: 'biedronka 87,50' → 87,50/Żywność/dziś]", async () => {
    modelReturns({ amount: 87.5, category: "Żywność", expense_date: null });
    const proposal = await parseExpenseSentence("biedronka 87,50");
    expect(proposal).toEqual({
      amount: 87.5,
      category: "Żywność",
      expense_date: todayInWarsaw(),
      description: "biedronka 87,50",
      parse_error: false,
    });
  });

  it("normalizuje przecinek dziesiętny w kwocie zwróconej jako string [PRD §Business Logic: wejście '87,50']", async () => {
    modelReturns(JSON.stringify({ amount: "87,50", category: "Żywność", expense_date: null }));
    const proposal = await parseExpenseSentence("biedronka 87,50");
    expect(proposal.amount).toBe(87.5);
    expect(proposal.parse_error).toBe(false);
  });

  it("dopasowuje kategorię bez rozróżniania wielkości liter do ustalonego zestawu [PRD: kategoria z ustalonego zestawu 8]", async () => {
    modelReturns({ amount: 12, category: "żywność", expense_date: null });
    const proposal = await parseExpenseSentence("kawa 12");
    expect(proposal.category).toBe("Żywność");
  });

  it("kategorię spoza zestawu zamienia na null do ręcznego uzupełnienia [PRD FR-003: braki uzupełnia użytkownik]", async () => {
    modelReturns({ amount: 12, category: "Kryptowaluty", expense_date: null });
    const proposal = await parseExpenseSentence("bitcoin 12");
    expect(proposal.category).toBeNull();
  });

  it("zachowuje datę wczorajszą [US-01/plan S-01: 'paliwo 200 zł wczoraj' → data wczorajsza]", async () => {
    const yesterday = shiftDays(todayInWarsaw(), -1);
    modelReturns({ amount: 200, category: "Transport", expense_date: yesterday });
    const proposal = await parseExpenseSentence("paliwo 200 zł wczoraj");
    expect(proposal.expense_date).toBe(yesterday);
  });

  it("datę sprzed ponad roku zastępuje dzisiejszą [okno -1…366 dni, test-plan Risk Response #1]", async () => {
    modelReturns({ amount: 10, category: "Inne", expense_date: shiftDays(todayInWarsaw(), -400) });
    const proposal = await parseExpenseSentence("coś starego 10");
    expect(proposal.expense_date).toBe(todayInWarsaw());
  });

  it("datę dalszą niż jutro zastępuje dzisiejszą [okno -1…366 dni]", async () => {
    modelReturns({ amount: 10, category: "Inne", expense_date: shiftDays(todayInWarsaw(), 2) });
    const proposal = await parseExpenseSentence("coś z przyszłości 10");
    expect(proposal.expense_date).toBe(todayInWarsaw());
  });

  it("awaria wywołania modelu degraduje do pustej propozycji z flagą błędu, bez wyjątku [test-plan Risk Response #1]", async () => {
    env.AI.run = vi.fn().mockRejectedValue(new Error("Workers AI down"));
    const proposal = await parseExpenseSentence("kawa 12");
    expect(proposal).toEqual({
      amount: null,
      category: null,
      expense_date: todayInWarsaw(),
      description: "kawa 12",
      parse_error: true,
    });
  });

  it("bełkot (nie-JSON) z modelu to awaria parsowania z flagą błędu [test-plan Risk Response #1: 'awaria modelu daje pustą propozycję z flagą błędu']", async () => {
    modelReturns("przepraszam, nie mogę pomóc z tym zadaniem");
    const proposal = await parseExpenseSentence("kawa 12");
    expect(proposal.amount).toBeNull();
    expect(proposal.category).toBeNull();
    expect(proposal.parse_error).toBe(true);
  });
});
