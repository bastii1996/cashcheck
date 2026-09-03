<!-- IMPL-REVIEW-REPORT -->

# Przegląd implementacji: Dodawanie wydatku jednym zdaniem

- **Plan**: context/changes/add-expense-by-sentence/plan.md
- **Zakres**: Fazy 1-4 z 4
- **Data**: 2026-09-03
- **Werdykt**: WYMAGA UWAGI
- **Ustalenia**: 0 krytycznych, 4 ostrzeżenia, 4 obserwacje

## Werdykty

| Wymiar                  | Werdykt                                                   |
| ----------------------- | --------------------------------------------------------- |
| Zgodność z planem       | WARNING (11/12 kontraktów MATCH; 1 drobny DRIFT)          |
| Dyscyplina zakresu      | WARNING (EXTRA świadome i udokumentowane)                 |
| Bezpieczeństwo i jakość | WARNING (0 krytycznych)                                   |
| Architektura            | PASS                                                      |
| Spójność wzorców        | PASS                                                      |
| Kryteria sukcesu        | PASS (re-weryfikacja na HEAD: lint/check/RLS/prod-401/CI) |

## Ustalenia

### F1 — Token Cloudflare w env całego joba CI

- **Ważność**: ⚠️ OSTRZEŻENIE
- **Wpływ**: 🏃 NISKI — szybka decyzja; poprawka oczywista i wąska
- **Wymiar**: Bezpieczeństwo i jakość
- **Lokalizacja**: .github/workflows/ci.yml:12
- **Szczegóły**: CLOUDFLARE_API_TOKEN w env na poziomie joba jest widoczny także dla `npm ci` — skompromitowana zależność (skrypt postinstall) mogłaby go eksfiltrować.
- **Poprawka**: Przenieś token do `env` wyłącznie kroków `astro sync` i `build` (wzorem SUPABASE\_\*).
- **Decyzja**: FIXED (env tylko na krokach sync/build)

### F2 — Połknięty błąd DB na liście wydatków

- **Ważność**: ⚠️ OSTRZEŻENIE
- **Wpływ**: 🏃 NISKI
- **Wymiar**: Bezpieczeństwo i jakość (niezawodność)
- **Lokalizacja**: src/pages/expenses.astro:16
- **Szczegóły**: `const { data }` ignoruje `error`; awaria DB = pusta lista „brak wydatków" bez logu (klasa „swallowed errors" — OWASP A10:2025).
- **Poprawka**: Przechwyć `error`, loguj `console.error` (widoczne w wrangler tail) i renderuj komunikat błędu zamiast pustego stanu.
- **Decyzja**: FIXED (log + stan błędu)

### F3 — Zapis przyjmuje nieistniejące/odległe daty

- **Ważność**: ⚠️ OSTRZEŻENIE
- **Wpływ**: 🏃 NISKI
- **Wymiar**: Bezpieczeństwo i jakość (niezawodność)
- **Lokalizacja**: src/pages/api/expenses/index.ts:11
- **Szczegóły**: Regex `\d{4}-\d{2}-\d{2}` przepuszcza „2026-13-45" (Postgres odrzuci → 500 zamiast 400) i dowolny rok; okno sanity z parsera nie obowiązuje przy zapisie.
- **Poprawka**: `.refine()` sprawdzający realną datę + okno -1…366 dni względem Europe/Warsaw (jak w expense-parser).
- **Decyzja**: FIXED (refine: realna data + okno -1..366)

### F4 — Filtr miesiąca bez górnej granicy (DRIFT)

- **Ważność**: ⚠️ OSTRZEŻENIE
- **Wpływ**: 🏃 NISKI
- **Wymiar**: Zgodność z planem
- **Lokalizacja**: src/pages/expenses.astro:19
- **Szczegóły**: Tylko `gte(monthStart)` — wydatek z datą przyszłego miesiąca pojawi się na „liście bieżącego miesiąca". Plan mówił o oknie bieżącego miesiąca.
- **Poprawka**: Dodaj `.lt(<pierwszy dzień następnego miesiąca>)`.
- **Decyzja**: FIXED (lt nextMonthStart)

### F5 — Brak limitu na zapytaniu listy

- **Ważność**: 💬 OBSERWACJA
- **Wpływ**: 🏃 NISKI
- **Wymiar**: Bezpieczeństwo i jakość (wydajność)
- **Lokalizacja**: src/pages/expenses.astro:17
- **Szczegóły**: Zapytanie miesiąca bez `.limit()`; praktycznie małe per user, ale bez bezpiecznika.
- **Poprawka**: `.limit(500)`.
- **Decyzja**: FIXED (limit 500)

### F6 — getUser() na trasach publicznych

- **Ważność**: 💬 OBSERWACJA
- **Wpływ**: 🔎 ŚREDNI — realny kompromis (latencja vs prostota middleware)
- **Wymiar**: Bezpieczeństwo i jakość (wydajność)
- **Lokalizacja**: src/middleware.ts:12
- **Szczegóły**: Sieciowy round-trip do Supabase na każdym żądaniu SSR, także na stronach publicznych.
- **Poprawka**: Rozważyć pominięcie auth-resolve dla ścieżek publicznych — dopiero gdy latencja realnie doskwiera.
- **Decyzja**: SKIPPED (latencja nie doskwiera; wrócić przy potrzebie)

### F7 — Starterowy signin.ts odstaje od AGENTS.md

- **Ważność**: 💬 OBSERWACJA
- **Wpływ**: 🏃 NISKI
- **Wymiar**: Spójność wzorców (kod odziedziczony, poza zakresem tej zmiany)
- **Lokalizacja**: src/pages/api/auth/signin.ts
- **Szczegóły**: Brak `export const prerender = false`, brak walidacji zod, `as string` z formData, odbicie error.message w query string — nowe endpointy są wzorcowe, odstaje stary.
- **Poprawka**: Wyrównać w osobnej małej zmianie (nie w tej).
- **Decyzja**: SKIPPED (zakolejkowane jako osobne zadanie)

### F8 — Zmiany EXTRA poza planem

- **Ważność**: 💬 OBSERWACJA
- **Wpływ**: 🏃 NISKI
- **Wymiar**: Dyscyplina zakresu
- **Lokalizacja**: middleware.ts:20 (redirecty), ci.yml (token), worker-configuration.d.ts
- **Szczegóły**: Redirecty / i /dashboard → /expenses (jawna prośba użytkownika po zamknięciu planu), token CI (konieczny fixup), wygenerowane typy — wszystko udokumentowane w komunikatach commitów.
- **Poprawka**: Zaakceptować jako udokumentowane dodatki.
- **Decyzja**: ACCEPTED (udokumentowane dodatki)
