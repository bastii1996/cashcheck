# Research — export-month-csv

Badania wewnętrzne (/10x-research, sub-agent po repo) + zewnętrzne (WebSearch;
Context7 MCP w tej sesji niedostępny — timeout połączenia, odnotowane jako
ograniczenie; źródła web na końcu).

## Wewnętrzne — co już robi baza kodu

- **Endpointy**: zero GET i zero odpowiedzi nie-JSON w całym `src/pages/api`
  (jedyne wyjątki: 204 bez ciała i redirect signout). CSV będzie pierwszym
  innym Content-Type. Wzorce do powtórzenia: `export const prerender = false`;
  lokalna bramka `if (!context.locals.user) → 401` (`index.ts:15-17`);
  `createClient(headers, cookies)` → null ⇒ 500 (`index.ts:19-22`); 500 z
  `console.error` (sink dla wrangler tail).
- **Middleware NIE chroni `/api`** — `PROTECTED_ROUTES = ["/dashboard","/expenses"]`
  (`src/middleware.ts:4`); ustawia tylko `locals.user`. Test-plan §2 ryzyko #3 i
  „must challenge: nowa trasa sama trafi pod ochronę" — nowy endpoint wymaga
  własnej bramki 401 **i asercji odmowy** w testach.
- **CSRF**: Astro `checkOrigin` pomija SAFE_METHODS (`GET/HEAD/OPTIONS` —
  `astro/dist/core/app/middlewares.js:7,14-16`) ⇒ eksport jako GET działa ze
  zwykłego `<a href>` z cookies same-origin, bez JS i bez nagłówka Origin.
- **Dane miesiąca**: zapytanie żyje inline w `src/pages/expenses.astro:17-24`
  (gte/lt na oknie z `currentMonthWindow()`, podwójny order, limit 500) — brak
  serwisu do reuse; okno jest czyste (`expense-month.ts`, bez `cloudflare:workers`,
  co jest warunkiem testowalności w Vitest — `vitest.config.ts:10`).
- **Formatowanie**: `plnFormatter` daje string z NBSP i `zł` — do CSV nieprzydatny
  (kwota ma być liczbą dla Excela); repo wszędzie trzyma kwoty jako number z
  zaokrągleniem do groszy, daty jako ISO string (`types.ts:16-25`). Kategorie
  z polskimi znakami (Żywność, Odzież) — UTF-8 krytyczne (incydent smoke S-01).
- **Zależności**: brak jakiejkolwiek biblioteki CSV; konwencja repo = czyste
  ręczne moduły w `src/lib/services/` (expense-month, normalizacje parsera);
  AGENTS.md nie ma polityki zależności, bar to 4 bramki tech-stack.md
  („typed, convention-based, popular, well-documented").
- **UI**: nagłówek `expenses.astro:39-56` ma już wzorzec akcji bez JS (form
  signout) i słownik klas outline (`border-white/20 bg-white/10 …`); wyspa nie
  jest potrzebna do pobrania pliku.
- **Testy**: unit wg §6.1 → `test/expense-csv.test.ts` przy czystym module;
  hak per-edit obejmie nowe pliki automatycznie (RISK_AREAS: `src/lib/services/`,
  `src/pages/api/`). E2E ma gotowy wzorzec asercji API: `page.request` +
  status/treść (`seed.spec.ts:18-22`); dla GET Origin zbędny. §6.3 (kontrakty
  HTTP poza Playwrightem) wciąż TBD — warstwą asercji pozostaje E2E.

## Zewnętrzne — co powinniśmy zrobić (decyzja biblioteczna)

- **Polski Excel**: separator listy `;` (przecinek = dziesiętny), **UTF-8 z BOM**
  jako najbezpieczniejsze dla polskich znaków, CRLF; pola z `;`/`"`/nową linią
  w cudzysłowach, wewnętrzne `"` podwajane. Linia `sep=;` działa tylko w Excelu
  i psuje inne parsery — pomijamy (polski Excel i tak domyślnie tnie po `;`).
- **Biblioteki**: `csv-stringify` ciągnie `Buffer` → na Workers wymaga
  `nodejs_compat` (tarcie dyskwalifikujące); `papaparse` zero-dep, ale to
  przede wszystkim parser — dodawanie zależności dla ~20 linii writera nie
  przechodzi rachunku koszt×sygnał; rekomendacja społeczności dla małych
  eksportów na edge: ręczny writer.

**Decyzja (dowodowa): ręczny, czysty writer CSV** w `src/lib/services/expense-csv.ts`
(BOM + `;` + CRLF + quoting RFC-4180-style, kwota `12,34` bez waluty, data ISO,
nagłówek polski `Data;Kategoria;Opis;Kwota`), endpoint GET
`/api/expenses/export.csv` z `Content-Disposition: attachment;
filename="wydatki-RRRR-MM.csv"`, link `<a>` w nagłówku strony. Zapytanie
miesiąca wyekstrahowane do współdzielonej funkcji, żeby SSR i eksport miały
jedno źródło (lekcja fix-month-window: jedno źródło okna).

Źródła zewnętrzne: techcommunity.microsoft.com (separator a locale),
toolhq.io/blog/csv-encoding-and-the-excel-utf8-bom, elysiate.com (list separator),
convertmystuff.com (BOM/quoting), community.cloudflare.com (csv na Workers),
importcsv.com/blog/papaparse-tutorial, npmjs.com/package/papaparse.
