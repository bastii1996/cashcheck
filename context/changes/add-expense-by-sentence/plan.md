# Dodawanie wydatku jednym zdaniem — Plan implementacji

## Przegląd

Implementujemy fragment S-01 (gwiazda przewodnia kamienia milowego M-1): zalogowany użytkownik wpisuje jedno zdanie („biedronka 87,50"), dostaje propozycję ustrukturyzowanego wydatku (kwota, kategoria, data), akceptuje lub poprawia ją i widzi zapisany wydatek na liście bieżącego miesiąca — bez przeładowania strony. Pełny pion: migracja danych z RLS → endpoint parsujący (Workers AI) → endpoint zapisu → strona chroniona z wyspą React → wdrożenie produkcyjne.

## Analiza bieżącego stanu

- Auth działa end-to-end: `src/middleware.ts` ustawia `context.locals.user` i strzeże tras z `PROTECTED_ROUTES` (`startsWith`, obecnie tylko `/dashboard`).
- `src/lib/supabase.ts` — `createClient(requestHeaders, cookies)` zwraca klienta SSR **albo `null`**, gdy brak env; każdy endpoint musi obsłużyć `null`.
- Wzorzec endpointu: `src/pages/api/auth/signin.ts` — uppercase `POST`, `context.redirect` / `Response`.
- Brak: tabel domenowych i katalogu `supabase/migrations/`, `src/types.ts`, zależności `zod`, bindingu AI w `wrangler.jsonc`, jakiegokolwiek UI wydatków.
- Produkcja: Worker `cashcheck` wdrożony, sekrety Supabase ustawione, CI (lint+build) zielone.
- Reguły z `context/foundation/lessons.md`: (1) weryfikuj zawartość `dist/` po buildzie, nie sam kod wyjścia; (2) nie czytaj stanu zaraz po zapisie na magazynie eventually-consistent — aktualizuj UI z odpowiedzi, którą masz w ręku.

## Pożądany stan końcowy

Na `https://cashcheck.sebastian-sobiech.workers.dev/expenses` zalogowany użytkownik wpisuje „paliwo 200 zł wczoraj", widzi kartę propozycji (200,00 / Transport / data wczorajsza), klika Zapisz, a wydatek pojawia się na liście bieżącego miesiąca bez przeładowania. Zdanie bez kwoty („kawa") daje kartę z pustą, podświetloną kwotą do uzupełnienia. Awaria AI daje pustą kartę z komunikatem — zapis dalej możliwy. Dane innego użytkownika są niewidoczne (RLS).

### Kluczowe odkrycia:

- `PROTECTED_ROUTES` w `src/middleware.ts:4` — dopisanie `"/expenses"` wystarcza do ochrony strony; endpointy API sprawdzają `context.locals.user` samodzielnie (middleware nie chroni `/api/*`).
- Sekrety idą przez `astro:env/server` (schemat w `astro.config.mjs`) — **Workers AI nie potrzebuje żadnego sekretu**, tylko bindingu `AI` w `wrangler.jsonc`; adapter `@astrojs/cloudflare` udostępnia bindingi w dev przez platform proxy czytający `wrangler.jsonc`.
- Astro 6: dostęp do bindingów przez `import { env } from "cloudflare:workers"` (API `Astro.locals.runtime` usunięte).
- Konwencja migracji (AGENTS.md): `supabase/migrations/YYYYMMDDHHmmss_short_description.sql`, RLS obowiązkowy, polityki per-operacja per-rola.

## Czego NIE robimy

- Edycji i usuwania zapisanych wydatków (S-02), podsumowania wg kategorii (S-03).
- Osobnego ręcznego formularza dodawania (FR-008 zaparkowane) — karta propozycji z brakami pełni tę rolę pośrednio.
- Wielu walut — kwoty są w PLN, bez pola waluty.
- Kategorii definiowanych przez użytkownika — stały zestaw 8 pozycji.
- Testów automatycznych nowym runnerem — brak test runnera w repo (reguła AGENTS.md); weryfikacja: lint, `astro check`, build, smoke-testy curl, testy ręczne.
- Historii miesięcy, filtrów, paginacji listy.

## Podejście do implementacji

Cztery fazy pionowo od danych do produkcji, każda z osobnym commitem i weryfikacją. Klasyfikację zdania robi **Cloudflare Workers AI** (binding `AI`, bez sekretów i kosztów — decyzja użytkownika), model wywoływany z wymuszonym schematem JSON; normalizacja i walidacja odpowiedzi po stronie naszego kodu (model proponuje, kod pilnuje typów). Parsowanie i zapis to **dwa osobne endpointy** — propozycja nigdy nie zapisuje niczego (FR-003: człowiek zatwierdza). Lista miesiąca renderowana serwerowo do propsów wyspy React; po zapisie lista aktualizuje się ze **zwróconego wiersza** (reguła lessons.md — bez ponownego odczytu).

## Krytyczne szczegóły implementacji

- **Strefa czasowa dat**: workerd działa w UTC. „Dziś"/„wczoraj" rozwiązywane w `Europe/Warsaw` (przez `Intl.DateTimeFormat` z `timeZone`), inaczej wieczorne wpisy dostaną złą datę. Dotyczy endpointu parse i domyślnej daty.
- **Kolejność zapisu do UI**: po `POST /api/expenses` wyspa dopisuje wydatek do stanu ze zwróconego wiersza (201 + JSON). Żadnego refetchu listy po zapisie.
- **`user_id` z `auth.uid()`**: kolumna `user_id` ma `default auth.uid()`; endpoint zapisu NIE przyjmuje `user_id` z klienta — RLS `with check (auth.uid() = user_id)` domyka guardrail prywatności.
- **Binding AI w dev**: jeśli `env.AI` będzie `undefined` pod `npm run dev`, włączyć jawnie `platformProxy: { enabled: true }` w opcjach adaptera w `astro.config.mjs` (proxy wymaga zalogowanego wranglera — jest ✓).

---

## Faza 1: Dane — tabela expenses z RLS + typy

### Przegląd

Powstaje jedyna tabela domenowa MVP z kompletem polityk RLS oraz współdzielone typy. Migracja zostaje zastosowana na hostowanym Supabase.

### Wymagane zmiany:

#### 1. Migracja

**Plik**: `supabase/migrations/20260902130000_create_expenses.sql`

**Cel**: Tabela `expenses` + RLS egzekwujący, że użytkownik widzi i modyfikuje wyłącznie własne wiersze (guardrail PRD).

**Kontrakt**: kolumny — `id uuid pk default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`, `amount numeric(10,2) not null check (amount > 0)`, `category text not null check (category in ('Żywność','Transport','Mieszkanie','Rachunki','Zdrowie','Rozrywka','Odzież','Inne'))`, `expense_date date not null default current_date`, `description text not null` (oryginalne zdanie lub opis), `created_at timestamptz not null default now()`. Indeks `(user_id, expense_date desc)`. `alter table … enable row level security` + **4 osobne polityki** dla roli `authenticated` (select/insert/update/delete), każda z `auth.uid() = user_id` (`using` i/lub `with check`); brak polityk dla `anon`.

#### 2. Typy współdzielone

**Plik**: `src/types.ts` (nowy)

**Cel**: Jedno źródło typów encji i DTO dla endpointów i UI (konwencja AGENTS.md).

**Kontrakt**: `EXPENSE_CATEGORIES` (stała krotka 8 kategorii), `ExpenseCategory`, `Expense` (kształt wiersza), `ExpenseProposal` (`amount: number | null`, `category: ExpenseCategory | null`, `expense_date: string`, `description: string`, `parse_error: boolean`), `CreateExpenseCommand` (amount, category, expense_date, description — bez user_id).

#### 3. Zastosowanie migracji na hostowanym Supabase

**Cel**: Tabela istnieje na produkcyjnej bazie.

**Kontrakt**: preferencyjnie `npx supabase link --project-ref qgvuxdlripohxquxxzwk` (wymaga `SUPABASE_ACCESS_TOKEN` od użytkownika) + `npx supabase db push`; fallback: wklejenie SQL w Dashboard → SQL Editor. Bramka ręczna.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Plik migracji istnieje i trzyma konwencję nazwy: `ls supabase/migrations/`
- `npx astro check` przechodzi (typy się kompilują)
- `npm run lint` przechodzi
- REST bez sesji nie widzi danych (RLS): `curl` na `/rest/v1/expenses` z samym kluczem publishable zwraca `[]`

#### Weryfikacja ręczna:

- Tabela widoczna w Supabase Dashboard z 4 politykami RLS (badge „RLS enabled")
- Wstawiony ręcznie wiersz testowy widoczny tylko dla właściciela

**Uwaga implementacyjna**: po zielonych weryfikacjach automatycznych zatrzymaj się na ręczne potwierdzenie przed Fazą 2.

---

## Faza 2: Parsowanie — Workers AI + endpoint propozycji

### Przegląd

Zdanie użytkownika zamienia się w `ExpenseProposal` przez binding Workers AI; braki i awarie degradują łagodnie (propozycja z pustymi polami, nigdy blokada).

### Wymagane zmiany:

#### 1. Binding AI

**Plik**: `wrangler.jsonc`

**Cel**: Udostępnić Workers AI w runtime bez sekretów.

**Kontrakt**: dodać `"ai": { "binding": "AI" }`.

#### 2. Zależność zod

**Plik**: `package.json`

**Cel**: Walidacja wejścia endpointów (wymóg AGENTS.md).

**Kontrakt**: `npm install zod` (dependency).

#### 3. Serwis parsowania

**Plik**: `src/lib/services/expense-parser.ts` (nowy)

**Cel**: Cała logika klasyfikacji w jednym serwisie: wywołanie modelu, wymuszenie JSON, normalizacja, rozwiązanie dat względnych, walidacja kategorii.

**Kontrakt**: `parseExpenseSentence(sentence: string): Promise<ExpenseProposal>`. Wywołanie nieoczywiste — kształt: `import { env } from "cloudflare:workers"`, potem

```ts
const result = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
  messages: [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: sentence },
  ],
  response_format: { type: "json_schema", json_schema: PROPOSAL_JSON_SCHEMA },
});
```

`SYSTEM_PROMPT` po polsku, z listą 8 kategorii, dzisiejszą datą w `Europe/Warsaw` i 3-4 przykładami few-shot („biedronka 87,50" → Żywność; „paliwo 200 zł wczoraj" → Transport, data-1). Normalizacja po stronie kodu: przecinek dziesiętny → kropka, kwota ≤ 0 lub nieliczbowa → `null`, kategoria spoza zestawu → `null`, data nieparsowalna → dziś (Warszawa). Wyjątek z `env.AI.run` → `ExpenseProposal` z `null`ami, `parse_error: true` (bez rzucania).

#### 4. Endpoint propozycji

**Plik**: `src/pages/api/expenses/parse.ts` (nowy)

**Cel**: HTTP-owa fasada serwisu; niczego nie zapisuje.

**Kontrakt**: `export const prerender = false`; `POST` przyjmuje JSON `{ sentence: string }` (zod: min 1, max 300 znaków, trim); `401` gdy brak `context.locals.user`; `400` przy złym wejściu; `200` + `ExpenseProposal` zawsze poza tym (także przy `parse_error`).

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- `npm run lint` i `npx astro check` przechodzą
- Dev server: `curl -X POST /api/expenses/parse` bez sesji → 401
- Z sesją (lub tymczasowo przez test ręczny) `{"sentence":"biedronka 87,50"}` → 200 z `amount: 87.5`, `category: "Żywność"`, dzisiejszą datą

#### Weryfikacja ręczna:

- „paliwo 200 zł wczoraj" → Transport, data wczorajsza (Warszawa)
- „kawa" → `amount: null`, sensowna kategoria lub `null`, bez błędu HTTP

**Uwaga implementacyjna**: stop na ręczne potwierdzenie przed Fazą 3.

---

## Faza 3: UI + zapis — strona /expenses z wyspą React

### Przegląd

Domyka US-01: wpis → propozycja → poprawka/akceptacja → zapis → lista miesiąca bez przeładowania.

### Wymagane zmiany:

#### 1. Endpoint zapisu

**Plik**: `src/pages/api/expenses/index.ts` (nowy)

**Cel**: Trwały zapis zatwierdzonego wydatku; zwraca utworzony wiersz do aktualizacji UI.

**Kontrakt**: `prerender = false`; `POST` z `CreateExpenseCommand` (zod: `amount` dodatni ≤ 100000, `category` z `EXPENSE_CATEGORIES`, `expense_date` ISO `YYYY-MM-DD`, `description` 1–300 znaków); `401` bez usera; insert przez `createClient(...)` (RLS + default `auth.uid()` wypełnia `user_id`); `201` + pełny wiersz `Expense`.

#### 2. Strona chroniona

**Plik**: `src/pages/expenses.astro` (nowy) + `src/middleware.ts` (edycja) + `src/pages/dashboard.astro` (edycja)

**Cel**: Miejsce całego przepływu; server-side pobranie listy bieżącego miesiąca jako propsy startowe.

**Kontrakt**: dopisać `"/expenses"` do `PROTECTED_ROUTES`; strona pobiera wydatki zalogowanego użytkownika z `expense_date` w bieżącym miesiącu (Warszawa), sortowane malejąco, i renderuje `<ExpensesApp client:load expenses={...} />`; na `dashboard.astro` link do `/expenses`.

#### 3. Wyspa React

**Plik**: `src/components/expenses/ExpensesApp.tsx` (nowy; wolno rozbić na podkomponenty w tym katalogu)

**Cel**: Stan przepływu: pole zdania → karta propozycji będąca pełnym formularzem (puste pola podświetlone, komunikat przy `parse_error`) → zapis → dopisanie wiersza do listy ze zwróconego JSON-a.

**Kontrakt**: propsy `{ expenses: Expense[] }`; wywołuje `POST /api/expenses/parse` i `POST /api/expenses`; klasy przez `cn()` z `@/lib/utils`; bez dyrektyw Next.js; wygodne na telefonie (duże pola, input `inputmode` stosownie do pola kwoty). Stany: puste/ładowanie/propozycja/zapisano/błąd sieci.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- `npm run lint`, `npx astro check`, `npm run build` przechodzą
- `curl /expenses` bez sesji → redirect na `/auth/signin`
- `curl -X POST /api/expenses` bez sesji → 401

#### Weryfikacja ręczna:

- Pełny przepływ US-01 w przeglądarce na dev: zdanie → propozycja → zatwierdź → wiersz na liście bez przeładowania
- Poprawka pola propozycji przed zapisem działa; „kawa" → uzupełnienie kwoty ręcznie → zapis OK
- Przepływ wygodny w widoku mobilnym (DevTools 375px)

**Uwaga implementacyjna**: stop na ręczne potwierdzenie przed Fazą 4.

---

## Faza 4: Wdrożenie i weryfikacja produkcyjna

### Przegląd

To, co działa na dev, trafia na produkcję i jest zweryfikowane na żywym Supabase + Workers AI.

### Wymagane zmiany:

#### 1. Deploy

**Cel**: Nowa wersja Workera z bindingiem AI.

**Kontrakt**: `npm run build` → inspekcja `dist/` (lekcja: nie ufać kodowi wyjścia) → `npx wrangler deploy` → commit + push (CI zielone).

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Build przechodzi; `dist/server/entry.mjs` i strona `/expenses` obecne w artefakcie
- Deploy kończy się sukcesem z bindingiem `AI` na liście bindingów
- Produkcja: `GET /expenses` bez sesji → redirect; `POST /api/expenses/parse` bez sesji → 401
- CI na GitHubie zielone po pushu

#### Weryfikacja ręczna:

- Pełny przepływ US-01 na `https://cashcheck.sebastian-sobiech.workers.dev` na własnym koncie
- `npx wrangler tail cashcheck` nie pokazuje błędów podczas przepływu

---

## Strategia testowania

### Testy jednostkowe:

- Brak w tej zmianie — repo nie ma test runnera (reguła AGENTS.md: nie wprowadzać ad hoc; stack testowy dojdzie z planem testów).

### Testy integracyjne:

- Smoke-testy curl na dev i produkcji (auth-gating, kształty odpowiedzi) — wpisane w kryteria faz.

### Kroki testowania ręcznego:

1. „biedronka 87,50" → Żywność, 87,50, dziś → zapis → na liście.
2. „paliwo 200 zł wczoraj" → Transport, wczorajsza data (Warszawa).
3. „kawa" → kwota pusta i podświetlona → ręczne uzupełnienie → zapis.
4. Wylogowany: `/expenses` przekierowuje, POST-y zwracają 401.
5. Drugi użytkownik (nowe konto) nie widzi wydatków pierwszego.

## Uwagi dotyczące wydajności

NFR: propozycja ≤ 3 s (p95) — pojedyncze wywołanie Workers AI mieści się z zapasem; UI pokazuje stan ładowania od razu po wysłaniu (NFR: ciągła informacja zwrotna > 2 s). Limit 10 ms CPU free tier: żadnej ciężkiej pracy poza I/O.

## Uwagi dotyczące migracji

Baza jest pusta (zero tabel domenowych) — migracja czysto addytywna, bez backfillu i bez planu wycofania danych. Rollback kodu: `npx wrangler rollback` (migracja jest kompatybilna wstecz — poprzednia wersja aplikacji jej nie używa).

## Referencje

- Fragment roadmapy: `context/foundation/roadmap.md` (S-01)
- PRD: `context/foundation/prd.md` (FR-001–FR-004, US-01)
- Wzorzec endpointu: `src/pages/api/auth/signin.ts`
- Middleware: `src/middleware.ts:4`
- Lekcje: `context/foundation/lessons.md`

## Postęp

> Konwencja: `- [ ]` oczekujące, `- [x]` wykonane. Dodaj ` — <commit sha>` po zakończeniu kroku. Nie zmieniaj nazw tytułów kroków. Zobacz `references/progress-format.md`.

### Faza 1: Dane — tabela expenses z RLS + typy

#### Automatyczne

- [x] 1.1 Plik migracji istnieje zgodnie z konwencją nazw — 0635307
- [x] 1.2 `npx astro check` przechodzi — 0635307
- [x] 1.3 `npm run lint` przechodzi — 0635307
- [x] 1.4 REST bez sesji zwraca `[]` (RLS aktywny) — 0635307

#### Ręczne

- [x] 1.5 Tabela + 4 polityki RLS widoczne w Dashboardzie — 0635307
- [ ] 1.6 Wiersz testowy widoczny tylko dla właściciela

### Faza 2: Parsowanie — Workers AI + endpoint propozycji

#### Automatyczne

- [x] 2.1 Lint + astro check przechodzą — ef5b1f2
- [x] 2.2 POST /api/expenses/parse bez sesji → 401 — ef5b1f2
- [x] 2.3 „biedronka 87,50" → poprawna propozycja (kwota/kategoria/data) — ef5b1f2

#### Ręczne

- [x] 2.4 „paliwo 200 zł wczoraj" → Transport, wczorajsza data — ef5b1f2
- [x] 2.5 „kawa" → propozycja z brakami, bez błędu HTTP — ef5b1f2

### Faza 3: UI + zapis — strona /expenses z wyspą React

#### Automatyczne

- [x] 3.1 Lint + astro check + build przechodzą — 2555c61
- [x] 3.2 /expenses bez sesji → redirect na signin — 2555c61
- [x] 3.3 POST /api/expenses bez sesji → 401 — 2555c61

#### Ręczne

- [x] 3.4 Pełny przepływ US-01 na dev bez przeładowania strony — 2555c61
- [x] 3.5 Poprawka propozycji i uzupełnianie braków działa — 2555c61
- [x] 3.6 Wygodne na ekranie mobilnym (375px) — 2555c61

### Faza 4: Wdrożenie i weryfikacja produkcyjna

#### Automatyczne

- [ ] 4.1 Build + inspekcja dist/ (strona /expenses w artefakcie)
- [ ] 4.2 Deploy z bindingiem AI zakończony sukcesem
- [ ] 4.3 Produkcyjne smoke-testy auth-gatingu przechodzą
- [ ] 4.4 CI zielone po pushu

#### Ręczne

- [ ] 4.5 Pełny przepływ US-01 na produkcji
- [ ] 4.6 Brak błędów w wrangler tail podczas przepływu
