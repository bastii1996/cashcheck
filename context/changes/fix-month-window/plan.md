# Plan — fix-month-window

Jedna faza. Czerwony test już istnieje (`tests/e2e/month-window.spec.ts` —
reprodukcja z research.md §1); fix ma zrobić go zielonym bez psucia reszty suity.

## Phase 1: Okno miesiąca po stronie klienta + regresja

### Changes Required

- `src/lib/services/expense-month.ts` (nowy, czysty — bez `cloudflare:workers`):
  `todayInWarsaw`, `currentMonthWindow(today)`, `isInCurrentMonth(expenseDate, today?)`;
  porównania na stringach ISO.
- `src/lib/services/expense-parser.ts`: import + re-eksport `todayInWarsaw`
  z expense-month (testy i schema importują go stamtąd — API bez zmian).
- `src/pages/expenses.astro`: okno z `currentMonthWindow()` zamiast lokalnych obliczeń.
- `src/components/expenses/ExpensesApp.tsx`: `visibleExpenses = expenses.filter(isInCurrentMonth)`
  jako jedyne źródło listy, podsumowania i stanu pustego; `console.error` z kontekstem
  w czterech `catch` (research §3).
- `test/expense-month.test.ts`: wyrocznia z FR-007 — pierwszy/ostatni dzień miesiąca
  należy do okna, 15. poprzedniego i 1. następnego nie; przełom roku (grudzień→styczeń).

### Success Criteria

- `npx playwright test` — cała suita zielona, w tym month-window (wcześniej czerwony).
- `npm test` zielony; nowe unit testy wyroczni FR-007 przechodzą.
- Brak `cloudflare:workers` w imporcie modułów trafiających do bundla klienta.

## Progress

- [x] 1.1 helper expense-month + re-eksport + SSR reuse
- [x] 1.2 ExpensesApp: filtr widoku + logowanie błędów w catch
- [x] 1.3 unit testy expense-month (FR-007)
- [x] 1.4 pełna weryfikacja (vitest + cała suita E2E) i sprzątnięcie sieroty z repro
