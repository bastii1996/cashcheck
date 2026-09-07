# Plan — export-month-csv

Dowody: research.md tej zmiany. Decyzja biblioteczna: ręczny czysty writer
(uzasadnienie tam). Dwie fazy, każda kończy się zielenią lokalną.

## Phase 1: Czysty writer CSV + wspólne zapytanie miesiąca (unit)

### Changes Required

- `src/lib/services/expense-csv.ts` (nowy, czysty): `toMonthCsv(expenses: Expense[]): string`
  — BOM `﻿`, nagłówek `Data;Kategoria;Opis;Kwota`, CRLF, pola przez
  `escapeCsvField` (cudzysłów gdy `;`/`"`/`\n`, podwajanie `"`), kwota
  `String(amount.toFixed(2)).replace(".", ",")`, data ISO bez zmian.
- `src/lib/services/expense-query.ts` (nowy, czysty): `selectCurrentMonthExpenses(supabase)`
  — dokładnie zapytanie z `expenses.astro:17-24` (okno z `currentMonthWindow`);
  `expenses.astro` przechodzi na tę funkcję (jedno źródło zapytania).
- `test/expense-csv.test.ts`: wyrocznia z wymagań Excel-PL (research zewnętrzny),
  nie z kodu: plik zaczyna się od BOM; separator `;`; CRLF; kwota z przecinkiem
  bez `zł`; opis z `;` i `"` poprawnie cytowany/podwojony; polskie znaki
  (Żywność) przechodzą; pusta lista ⇒ sam nagłówek.

### Success Criteria

- `npm test` zielone (nowe testy + 32 istniejące); `expenses.astro` renderuje
  jak dotąd (E2E seed zielony).

## Phase 2: Endpoint GET + link + E2E kontraktu

### Changes Required

- `src/pages/api/expenses/export.csv.ts`: `export const prerender = false`;
  `GET` — 401 bez `locals.user` (wzorzec `index.ts:15-17`), 500 gdy brak
  supabase/błąd zapytania (console.error jak w repo), 200 z `toMonthCsv`,
  nagłówki: `Content-Type: text/csv; charset=utf-8`,
  `Content-Disposition: attachment; filename="wydatki-<RRRR-MM>.csv"`
  (miesiąc z `todayInWarsaw()`), `Cache-Control: no-store`.
- `src/pages/expenses.astro`: link `<a href="/api/expenses/export.csv">Eksport CSV</a>`
  w nagłówku obok Wyloguj, klasy outline jak sąsiedni przycisk.
- `tests/e2e/export-csv.spec.ts` (wg §6.6 i tests/e2e/AGENTS.md): jeden test —
  zalogowany `page.request.get` ⇒ 200, content-type text/csv, treść zaczyna się
  od BOM+`Data;Kategoria;Opis;Kwota`, Content-Disposition z nazwą pliku;
  świeży kontekst bez storageState ⇒ **401** (ryzyko #3: odmowa dla
  niezalogowanego — jawna asercja negatywna).

### Success Criteria

- `npx playwright test` — cała suita zielona (5 specs); `npm run lint` czysty.
- Deploy na produkcję + spot-check: GET bez sesji ⇒ 401.

## Progress

- [x] 1.1 expense-csv.ts + expense-query.ts + reuse w expenses.astro
- [x] 1.2 test/expense-csv.test.ts (wyrocznia Excel-PL)
- [x] 2.1 endpoint export.csv.ts + link w nagłówku
- [x] 2.2 e2e export-csv.spec.ts + pełna suita + deploy i spot-check
