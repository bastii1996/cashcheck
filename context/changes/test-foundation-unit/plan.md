# Fundament testów: Vitest + jednostkowe parsera i walidacji — Plan implementacji

## Przegląd

Faza 1 wdrożenia z `context/foundation/test-plan.md`: stawiamy runner (Vitest) i dowodzimy ochronę ryzyk #1 (kontrakt parsowania) i #5 (walidacja zapisu) golden-zestawem, którego oczekiwania pochodzą z wymagań (PRD/test-plan), nie z kodu. Zero zmian w zachowaniu produkcyjnym poza ewentualną poprawką luki `parse_error` (red→green), jeśli test z wyroczni ją potwierdzi.

## Analiza bieżącego stanu

Wg `research.md`: brak runnera; `cloudflare:workers` importowany na poziomie modułu parsera zatruwa cały łańcuch importów (także schemat); funkcje normalizacji są prywatne — publiczną powierzchnią jest `parseExpenseSentence`; typy `cloudflare:workers` są globalne (worker-configuration.d.ts). Kandydat na lukę: bełkot z modelu daje `parse_error: false`.

## Pożądany stan końcowy

`npm test` uruchamia Vitest: golden-testy parsera (kwoty z przecinkiem, kategorie case-insensitive, okno dat, kształty odpowiedzi modelu, awaria → `parse_error: true`) i testy schematu zapisu (daty nieistniejące/graniczne, limity kwot, enum kategorii z polskimi znakami) — wszystko zielone lokalnie, bez sieci, bez zmian w lint/check/build. Książka kucharska §6.1 wypełniona, wiersz §3 fazy 1 → `complete`.

## Czego NIE robimy

- Podpinania testów do CI i hooków per-edit (fazy 3–4 planu testów; lekcje m3l3+).
- Testów integracyjnych z bazą (faza 2 planu testów), testów E2E, testów jakości modelu.
- Refaktoru produkcyjnego „dla testowalności" — alias w konfigu Vitest wystarcza (research §Architecture 1).

## Podejście do implementacji

Zwykły `vitest.config.ts` (environment: node, aliasy `@`→`./src` i `cloudflare:workers`→stub). Golden-testy przez publiczne API z mockowanym `env.AI.run` (kształty odpowiedzi z research §3). Wyrocznie spisane w testach jako dane literalne z komentarzem źródła (PRD/US-01/test-plan) — nigdy wyliczane funkcjami produkcyjnymi. Test luki `parse_error` pisany najpierw wg wymagania (czerwony), potem minimalna poprawka w `extractRawProposal`/`parseExpenseSentence` (zielony).

## Krytyczne szczegóły implementacji

- **Stub musi eksportować `env`** (dokładnie ten symbol importuje produkt) z mutowalnym `AI.run`.
- **Okno dat liczone względem Europe/Warsaw** — testy okna używają `todayInWarsaw()` TYLKO do wyznaczenia dat wejściowych (wczoraj/jutro/+2 dni), a oczekiwanie („odrzucone"/„przyjęte") pochodzi z reguły w test-planie; to nie jest problem wyroczni, bo asercja dotyczy decyzji, nie wartości wyliczonej kodem.
- **`vi.mock`/alias**: mock ustawiany per test przez nadpisanie `env.AI.run`; między testami `vi.restoreAllMocks()` + reset stubu.

## Faza 1: Runner — Vitest z aliasami i smoke-testem

### Wymagane zmiany:

#### 1. Zależność i skrypty

**Plik**: `package.json`

**Cel**: Runner dostępny lokalnie.

**Kontrakt**: `vitest` w devDependencies; skrypty `"test": "vitest run"`, `"test:watch": "vitest"`.

#### 2. Konfiguracja i stub

**Pliki**: `vitest.config.ts` (nowy), `test/stubs/cloudflare-workers.ts` (nowy)

**Cel**: Rozwiązywalność `cloudflare:workers` i aliasu `@` w testach; środowisko node; zakres plików `test/**/*.test.ts`.

**Kontrakt**: `resolve.alias: { "cloudflare:workers": <ścieżka stubu>, "@": <./src> }`. Stub eksportuje `env` z `AI.run` domyślnie odrzucającym (test MUSI nadpisać — brak cichego sukcesu).

#### 3. Smoke-test runnera

**Plik**: `test/smoke.test.ts` (nowy; usuwany w Fazie 2 lub zastępowany realnymi testami)

**Cel**: Dowód, że runner, aliasy i stub działają zanim powstaną właściwe testy.

**Kontrakt**: import z `@/types` i ze stubu przechodzi; jeden trywialny assert.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- `npm test` przechodzi (smoke)
- `npm run lint` i `npx astro check` przechodzą (konfiguracja testów nie psuje reszty)

#### Weryfikacja ręczna:

- (brak)

---

## Faza 2: Golden-testy parsera + testy schematu (+ ewentualny red→green)

### Wymagane zmiany:

#### 1. Golden-testy parsera

**Plik**: `test/expense-parser.test.ts` (nowy)

**Cel**: Ochrona ryzyka #1 zgodnie z Risk Response Guidance #1.

**Kontrakt**: przypadki z wyrocznią z wymagań (każdy z komentarzem źródła): (a) odpowiedź-obiekt {87.5, Żywność, null} → propozycja 87.5/Żywność/dzisiejsza data [US-01]; (b) odpowiedź-string JSON z kwotą "87,50" → 87.5 [PRD: przecinek dziesiętny]; (c) kategoria "żywność" małą literą → "Żywność" [zestaw 8 kategorii]; (d) kategoria spoza zestawu → null; (e) data wczorajsza → zachowana, data sprzed >366 dni → dzisiejsza, data +2 dni → dzisiejsza [okno z planu]; (f) `AI.run` odrzuca → nulle + `parse_error: true`, bez wyjątku [Risk Response #1]; (g) `response` = bełkot nie-JSON → nulle + **`parse_error: true`** [wyrocznia z test-planu — spodziewany CZERWONY na obecnym kodzie]; (h) opis zawsze = zdanie wejściowe.

#### 2. Poprawka luki (warunkowa — jeśli (g) czerwony)

**Plik**: `src/lib/services/expense-parser.ts`

**Cel**: Bełkot z modelu = awaria parsowania → flaga błędu (UI pokaże komunikat, nie gołą pustą kartę).

**Kontrakt**: nieparsowalny string w `response` skutkuje `parse_error: true` (minimalna zmiana: sygnalizacja z `extractRawProposal` zamiast cichego `{}`); pozostałe zachowania bez zmian.

#### 3. Testy schematu zapisu

**Plik**: `test/expense-schema.test.ts` (nowy)

**Cel**: Ochrona ryzyka #5.

**Kontrakt**: odrzuca: `2026-13-45`, `2026-02-31`, `2099-01-01`, datę +2 dni, kwotę 0/ujemną/>100000, kategorię spoza zestawu, pusty opis, opis >300; przyjmuje: wczoraj/dziś/jutro, `Żywność` (UTF-8), kwotę 0.01 i 100000. Każdy przypadek z komentarzem źródła (impl-review F3 / PRD FR-003 / okno z planu).

#### 4. Książka kucharska i stan wdrożenia

**Pliki**: `context/foundation/test-plan.md`

**Cel**: §6.1 wypełnione (lokalizacja `test/`, nazewnictwo `<moduł>.test.ts`, test referencyjny, `npm test`); §3 wiersz 1 → `complete`; usunięty smoke-test z Fazy 1.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- `npm test` zielone (wszystkie golden + schemat), w tym przypadek (g) po poprawce
- `npm run lint`, `npx astro check`, `npm run build` przechodzą
- Produkcyjny smoke bez regresji: parse „biedronka 87,50" nadal 200 z poprawną propozycją (jeśli poprawka (2) dotknęła kodu produkcyjnego → deploy + weryfikacja)

#### Weryfikacja ręczna:

- Przegląd listy przypadków: każda wyrocznia ma komentarz źródła (nie pochodzi z kodu)

## Strategia testowania

To ta zmiana ustanawia strategię — patrz test-plan §1–§2. Mockujemy wyłącznie granicę modelu (stub `env.AI.run`); zero mocków modułów wewnętrznych.

## Referencje

- `context/foundation/test-plan.md` §2 Risk #1/#5 + Risk Response Guidance
- `context/changes/test-foundation-unit/research.md` (kotwice i luka parse_error)

## Postęp

> Konwencja: `- [ ]` oczekujące, `- [x]` wykonane. Dodaj ` — <commit sha>` po zakończeniu kroku.

### Faza 1: Runner — Vitest z aliasami i smoke-testem

#### Automatyczne

- [x] 1.1 `npm test` przechodzi na smoke — 5a715f7
- [x] 1.2 Lint + astro check bez regresji — 5a715f7

### Faza 2: Golden-testy parsera + testy schematu

#### Automatyczne

- [x] 2.1 Golden parsera zielone (w tym parse_error po red→green) — 6da9d27
- [x] 2.2 Testy schematu zielone — 6da9d27
- [x] 2.3 Lint + check + build bez regresji; produkcja bez regresji (jeśli dotknięto kodu) — 6da9d27

#### Ręczne

- [x] 2.4 Każda wyrocznia ma komentarz źródła z wymagań — 6da9d27
