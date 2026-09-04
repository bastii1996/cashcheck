# Research (dowody) — fix-month-window

Zbieżność dowodów z dwóch źródeł (m3l5: monitoring / logi / reprodukcja Playwright /
kod). Sentry brak w projekcie; `wrangler tail` nic nie pokaże — to nie jest błąd
serwera, tylko błędny stan klienta.

## 1. Reprodukcja (Playwright)

`tests/e2e/month-window.spec.ts` — przepływ UI: propozycja → korekta daty na 15. dzień poprzedniego miesiąca → zapis. Wynik pierwszego uruchomienia: **czerwony**
na asercji `listitem toBeHidden` — wiersz z datą poprzedniego miesiąca JEST widoczny
pod nagłówkiem „TEN MIESIĄC" (i zasila podsumowanie kategorii „Rachunki").
Po przeładowaniu strony wiersz znika (SSR filtruje) — klasyczny stan rozjechany
klient/serwer.

## 2. Kod

- Okno miesiąca liczone wyłącznie w SSR: `src/pages/expenses.astro:10-13`
  (monthStart/nextMonthStart w Europe/Warsaw) i zapytanie `:22-23`
  (`gte(monthStart).lt(nextMonthStart)`).
- Klient nie zna okna: `src/components/expenses/ExpensesApp.tsx:107`
  (`handleSave` — `[saved, ...prev]` bez sprawdzenia miesiąca) oraz `:159-163`
  (`handleUpdate` — map + sort, bez filtra; edycja daty na inny miesiąc zostawia
  wiersz w widoku). Podsumowanie (`summary`, `:206-215`) liczy z tego samego
  niefiltrowanego stanu → zawyżone ŁĄCZNIE (FR-007).
- Powiązane: schemat zapisu dopuszcza daty do 366 dni wstecz (zamierzone — wpis
  zaległy), więc ścieżka jest legalna dla poprawnych danych; błąd leży w widoku.

## 3. Przełknięte błędy (anty-wzorzec z lekcji, OWASP A10)

Wszystkie cztery `catch` w `ExpensesApp.tsx` (`:70`, `:110`, `:166`, `:196`) gubią
wyjątek — UI pokazuje ogólny komunikat, a dowód (status HTTP, treść) przepada.
Naprawa przy okazji: `console.error` z kontekstem (wzorzec jak w
`expense-parser.ts:140`).

## 4. Kierunek naprawy

Czyste okno miesiąca w `src/lib/services/expense-month.ts` (bez `cloudflare:workers`
— moduł trafia do bundla klienta!): `todayInWarsaw`, `currentMonthWindow`,
`isInCurrentMonth`. `expense-parser.ts` re-eksportuje `todayInWarsaw` (testy
importują go stamtąd). `ExpensesApp` renderuje i sumuje z
`expenses.filter(isInCurrentMonth)`; `expenses.astro` używa tego samego
`currentMonthWindow` (jedno źródło prawdy okna). Warstwa regresji: unit
(`test/expense-month.test.ts`, wyrocznia z FR-007) + istniejący czerwony E2E robi
się zielony.
