# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-09-04

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "<the
   team is worried about X, and the failure would surface somewhere in
   <area>>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents _what
   could fail_ and _why we believe it's likely_ — drawn from documents,
   interview, and codebase _signal_ (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src/`, `supabase/` (30 dni, 10 commitów — sygnał wystarczający).

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the _evidence that surfaced
this risk_ — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| #   | Risk (failure scenario)                                                                                                                                                                   | Impact | Likelihood | Source (evidence — not anchor)                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Kontrakt parsowania pęka: po zmianie promptu/modelu/normalizacji zdanie daje złe kwoty/daty/kategorie, albo awaria modelu blokuje dodanie wydatku zamiast degradować do pustej propozycji | High   | High       | interview Q3 (obszar zmieniany bez pewności); PRD §Business Logic + NFR ≤3 s; hot-spot dir `src/lib/services/` (2 commity/30d)                                             |
| 2   | Użytkownik czyta lub modyfikuje cudze wydatki — izolacja pęka przy zmianie polityk, endpointów lub migracji (nadużycie: IDOR — kontrola własności, nie tylko zalogowania)                 | High   | Medium     | interview Q1 (największa obawa); PRD §Success Criteria/Guardrails + §Access Control; hot-spot dir `src/pages/api/expenses/` (3 commity/30d)                                |
| 3   | Regresja bramkowania dostępu: niezalogowany dostaje treść chronioną albo endpoint przestaje wymagać sesji po zmianie tras/przekierowań                                                    | High   | Medium     | PRD FR-001; archive/2026-09-02-add-expense-by-sentence (trasy chronione i przekierowania zmieniane dwukrotnie w tygodniu wdrożenia)                                        |
| 4   | Zielony pipeline ≠ działająca produkcja: build i deploy przechodzą, a kluczowy przepływ na produkcji jest martwy (obcięty artefakt, brak sekretu, propagacja)                             | High   | Medium     | interview Q2 („zielone CI ≠ produkcja" — dwukrotnie przerobione w tym projekcie); lessons.md (build z exit 0 ≠ poprawny artefakt); infrastructure.md §Risk Register        |
| 5   | Walidacja zapisu przepuszcza niepoprawne dane lub odrzuca poprawne (daty graniczne i nieistniejące, przecinek dziesiętny, polskie znaki w kategorii na granicy UTF-8)                     | Medium | Medium     | archive/2026-09-03-add-expense-by-sentence/reviews/impl-review.md (ustalenie F3: nieistniejąca data → 500); incydent kodowania UTF-8 podczas smoke-testów S-01; PRD FR-003 |

High-impact × low-likelihood scenariusze (awaria Supabase/Cloudflare jako dostawców) należą do obserwowalności (`wrangler tail`, observability Workers), nie do testów — odnotowane zamiast dopychania mapy.

### Risk Response Guidance

| Risk | What would prove protection                                                                                                                                                                                                             | Must challenge                                                                                    | Context `/10x-research` must ground                                                                                                                       | Likely cheapest layer                                                                     | Anti-pattern to avoid                                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| #1   | Golden-zestaw polskich zdań (z PRD i wywiadu, oczekiwania spisane NIEZALEŻNIE od kodu) daje oczekiwane kwoty/kategorie/daty względne w Europe/Warsaw; wstrzyknięta awaria modelu daje pustą propozycję z flagą błędu, nigdy wyjątek/5xx | „model zawsze zwróci poprawny JSON"; „oczekiwana wartość może pochodzić z bieżącej implementacji" | granica wywołania modelu (kształt odpowiedzi, tryb JSON), reguły normalizacji, źródło „dzisiaj" dla dat względnych, jak wstrzyknąć wynik modelu bez sieci | unit (normalizacja z wstrzykniętym wynikiem) + kontrakt endpointu propozycji              | problem wyroczni: asercje przepisane z implementacji — test tautologiczny zatwierdza bieżące błędy; testowanie „mądrości" modelu (niedeterministyczne) |
| #2   | Drugi użytkownik nie może odczytać, zmienić ani usunąć wiersza pierwszego żadną z czterech operacji — nawet znając identyfikator wiersza; próba kończy się pustym wynikiem/odmową                                                       | „zalogowany = uprawniony"; „skoro UI nie pokazuje cudzych danych, to dostępu nie ma"              | kształt polityk dostępu wiersz-po-wierszu, jak sesja wiąże się z tożsamością przy zapisie, jak podnieść dwie niezależne sesje testowe                     | integration na realnym Postgresie (lokalny stack) — wszystkie 4 operacje × 2 użytkowników | mockowanie klienta bazy — polityki wiersz-po-wierszu w ogóle nie są wtedy testowane (lustro implementacji)                                             |
| #3   | Każda trasa chroniona bez sesji odpowiada przekierowaniem/odmową; trasy publiczne działają bez sesji; endpointy mutujące bez sesji odmawiają                                                                                            | „dopasowanie prefiksem wystarcza"; „nowa trasa sama trafi pod ochronę"                            | źródło prawdy listy tras chronionych, pełna mapa tras i metod, zachowanie ochrony CSRF dla żądań spoza origin                                             | contract/integration po HTTP na serwerze dev (tanie asercje statusów)                     | tylko szczęśliwa ścieżka (asercja 200 dla zalogowanego bez asercji odmowy dla niezalogowanego)                                                         |
| #4   | Po każdym wdrożeniu produkcja przechodzi smoke: odmowy bez sesji, kontrakt propozycji, pełny cykl dodaj–edytuj–usuń kontem testowym; niepowodzenie smoke = wdrożenie uznane za nieudane                                                 | „zielony build = działa"; „propagacja wersji jest natychmiastowa"                                 | jakie sekrety/konta są dostępne w CI, jak długo trwa propagacja wersji, które asercje są deterministyczne na produkcji                                    | skrypt smoke po deployu (dziś ręczny, docelowo bramka CI — §3 Faza 3)                     | sprawdzanie wyłącznie kodu wyjścia builda/deployu (lekcja: artefakt bywa obcięty przy exit 0)                                                          |
| #5   | Graniczne ładunki zapisu (nieistniejąca data, data poza oknem, przecinek, 0, ujemne, > limitu, kategoria spoza zestawu, polskie znaki) dostają czytelną odmowę 4xx; poprawne przechodzą                                                 | „regex formatu daty wystarcza za walidację daty"; „klient zawsze wysyła poprawny JSON w UTF-8"    | wspólny schemat walidacji i jego konsumenci, zachowanie bazy przy danych spoza ograniczeń, ścieżka kodowania znaków od formularza do bazy                 | unit schematu walidacji + integration endpointu zapisu                                    | kopiowanie walidatora do testu (ta sama funkcja po obu stronach asercji)                                                                               |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| #   | Phase name                                          | Goal (one line)                                                                                                                                  | Risks covered | Test types                      | Status      | Change folder |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------- | ----------- | ------------- |
| 1   | Fundament: runner + jednostkowe parsera i walidacji | Postawić runner i udowodnić ochronę normalizacji zdań oraz schematu zapisu golden-zestawem niezależnym od kodu                                   | #1, #5        | unit                            | not started | —             |
| 2   | Integracja: izolacja użytkowników + kontrakty API   | Udowodnić na realnym Postgresie, że cudze wiersze są nietykalne (4 operacje × 2 użytkowników) i że bramkowanie tras/endpointów odmawia bez sesji | #2, #3, #5    | integration, contract           | not started | —             |
| 3   | Smoke produkcyjny po wdrożeniu                      | Zamienić ręczne skrypty smoke w powtarzalną bramkę uruchamianą po deployu                                                                        | #4, #3        | smoke (deterministyczny skrypt) | not started | —             |
| 4   | Okablowanie bramek jakości                          | Zablokować dolną granicę: testy w CI przed buildem, szybkie testy per-edit lokalnie                                                              | cross-cutting | gates                           | not started | —             |

**Status vocabulary** (fixed — parser literals): `not started` → `change opened` → `researched` → `planned` → `implementing` → `complete`.

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.

| Layer              | Tool                                   | Version                          | Notes                                                                                                                                                    |
| ------------------ | -------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| unit + integration | Vitest                                 | none yet — see §3 Phase 1        | naturalny dla stosu Vite/Astro; AGENTS.md dopuszcza wprowadzenie runnera wyłącznie przez ten plan                                                        |
| API mocking        | brak — wstrzyknięcie na granicy modelu | n/a                              | mockujemy wyłącznie wynik wywołania modelu (wstrzyknięty obiekt), nigdy modułów wewnętrznych ani klienta bazy                                            |
| integration DB     | lokalny stack Supabase (Docker)        | none yet — see §3 Phase 2        | realny Postgres z politykami wiersz-po-wierszu; wymaga Dockera na maszynie dev                                                                           |
| e2e                | brak — celowo                          | n/a                              | koszt × sygnał: smoke produkcyjny (§3 Faza 3) pokrywa przepływ krytyczny taniej niż utrzymanie Playwrighta w solo-projekcie; do rewizji przy wzroście UI |
| smoke produkcyjny  | skrypt Node (fetch)                    | istnieje ad hoc — see §3 Phase 3 | deterministyczne asercje statusów i kontraktów na koncie testowym                                                                                        |

**Stack grounding tools (current session):**

- Docs: Context7 MCP — dostępny w sesjach projektu (w tej sesji połączenie zawiodło); wersje Vitest/Astro do ugruntowania w badaniu Fazy 1; checked: 2026-09-04
- Search: brak dedykowanego MCP — badania webowe przez subagentów (użyte przy infrastructure.md); checked: 2026-09-04
- Runtime/browser: panel przeglądarki Claude — użyty do ręcznej weryfikacji S-01–S-03; nie planowany jako warstwa testowa (patrz wiersz e2e); checked: 2026-09-04
- Provider/platform: gh CLI (runy CI), wrangler (deploy/tail/rollback), Supabase REST — istotne dla bramek Fazy 3/4; checked: 2026-09-04

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required for §3 Phase <N>" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.

| Gate                                             | Where                     | Required?                    | Catches                                  |
| ------------------------------------------------ | ------------------------- | ---------------------------- | ---------------------------------------- |
| lint + typecheck (`npm run lint`, `astro check`) | local + CI                | required (już podłączone)    | dryf składni i typów                     |
| unit (parser/walidacja)                          | local + CI                | required after §3 Phase 1    | regresje normalizacji i schematów        |
| integration (RLS + kontrakty)                    | local + CI                | required after §3 Phase 2    | pęknięta izolacja, dziury w bramkowaniu  |
| smoke produkcyjny po deployu                     | CI (po `wrangler deploy`) | required after §3 Phase 3    | awarie widoczne tylko na produkcji       |
| szybkie testy per-edit (hook)                    | local (agent loop)        | recommended after §3 Phase 4 | regresje w chwili edycji                 |
| build artifact inspection                        | local + CI                | required (lessons.md)        | obcięty artefakt przy zielonym exit code |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase <N>."

### 6.1 Adding a unit test

- TBD — see §3 Phase 1 (wzorzec: golden-zestaw zdań → oczekiwana propozycja; wyrocznia z wymagań, nie z kodu).

### 6.2 Adding an integration test

- TBD — see §3 Phase 2 (wzorzec: dwóch użytkowników na realnym Postgresie; odmowa/pusty wynik dla cudzych wierszy we wszystkich 4 operacjach).

### 6.3 Adding a contract test for an API endpoint

- TBD — see §3 Phase 2 (wzorzec: asercje statusów 401/400/404 bez sesji i ze złym ładunkiem, zanim sprawdzisz 2xx).

### 6.4 Adding a production smoke assertion

- TBD — see §3 Phase 3 (wzorzec: deterministyczna asercja kontraktu na koncie testowym, odporna na propagację wersji).

### 6.5 Per-rollout-phase notes

(Optional. After each phase lands, /10x-implement appends a 2-3 line note here.)

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5). Future
contributors should respect these unless the underlying assumption changes.

- **Piksele i wygląd UI** — żadnych testów migawkowych/wizualnych: solo-projekt, wygląd oceniany okiem, migawki psują się częściej niż łapią regresje. Re-evaluate gdy UI zacznie budować więcej niż jedna osoba. (Source: Phase 2 interview Q5.)
- **Jakość odpowiedzi modelu AI** — nie testujemy „czy model mądrze kategoryzuje" (niedeterministyczne; krok akceptacji użytkownika jest siatką bezpieczeństwa z PRD FR-003). Testujemy wyłącznie kontrakt i normalizację (§2 #1). Re-evaluate przy zmianie modelu na słabszy/tańszy. (Source: §2 Risk Response Guidance #1.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-09-04
- Stack versions last verified: 2026-09-04
- AI-native tool references last verified: 2026-09-04

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
