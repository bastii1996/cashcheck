# Dodawanie wydatku jednym zdaniem — Krótki plan

> Pełny plan: `context/changes/add-expense-by-sentence/plan.md`

## Co i dlaczego

Budujemy rdzeń CashCheck (fragment S-01, gwiazda przewodnia M-1): użytkownik wpisuje jedno zdanie, aplikacja proponuje kwotę/kategorię/datę, użytkownik zatwierdza lub poprawia, wydatek ląduje na liście bieżącego miesiąca. To najmniejszy przepływ potwierdzający hipotezę produktu: usunięcie tarcia wpisu utrzymuje nawyk śledzenia wydatków.

## Punkt wyjścia

Starter z działającym auth (Supabase e-mail+hasło, middleware z trasami chronionymi), wdrożony na Cloudflare Workers z CI. Zero tabel domenowych, zero UI wydatków, brak zod i bindingu AI.

## Pożądany stan końcowy

Na produkcji zalogowany użytkownik wpisuje „paliwo 200 zł wczoraj" i po ≤ 3 s widzi kartę propozycji (200,00 / Transport / wczorajsza data), zapisuje ją i wydatek pojawia się na liście miesiąca bez przeładowania. Zdanie niekompletne lub awaria AI degradują do formularza z brakami — dodanie wydatku nigdy nie jest zablokowane.

## Kluczowe podjęte decyzje

| Decyzja                | Wybór                                                                                | Dlaczego (1 zdanie)                                                       | Źródło    |
| ---------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------- |
| Wykonawca klasyfikacji | Cloudflare Workers AI (binding `AI`)                                                 | Zero nowych kont/sekretów/kosztów; krok akceptacji łapie słabsze parsy    | Plan      |
| Zestaw kategorii       | 8 stałych: Żywność, Transport, Mieszkanie, Rachunki, Zdrowie, Rozrywka, Odzież, Inne | Mały zbiór = trafniejsza klasyfikacja; bez kategorii własnych (Non-Goals) | Plan      |
| Awarie/braki parsu     | Karta propozycji zawsze, braki puste i podświetlone                                  | Awaria AI nie blokuje dodania — duch FR-008 bez osobnego formularza       | Plan      |
| Parsuj vs zapisz       | Dwa osobne endpointy                                                                 | Propozycja niczego nie zapisuje — człowiek zatwierdza (FR-003)            | PRD       |
| Prywatność             | RLS per-operacja + `user_id default auth.uid()`; endpoint nie przyjmuje user_id      | Guardrail PRD egzekwowany w bazie, nie w kodzie aplikacji                 | PRD       |
| Aktualizacja listy     | Ze zwróconego wiersza POST-a, bez refetchu                                           | Reguła lessons.md o read-after-write na eventually-consistent storage     | Lessons   |
| Strefa czasowa dat     | „dziś/wczoraj" liczone w Europe/Warsaw                                               | workerd działa w UTC — wieczorne wpisy dostałyby złą datę                 | Plan      |
| Testy                  | Bez nowego runnera; lint + astro check + build + curl + ręczne                       | Reguła AGENTS.md: stack testowy dojdzie z planem testów                   | AGENTS.md |

## Zakres

**W zakresie:** migracja `expenses` z RLS; `src/types.ts`; zod; binding AI; `POST /api/expenses/parse`; `POST /api/expenses`; strona `/expenses` (chroniona) z wyspą React (wpis → propozycja → zapis → lista miesiąca); deploy i weryfikacja produkcyjna.

**Poza zakresem:** edycja/usuwanie (S-02); podsumowanie kategorii (S-03); ręczny formularz (FR-008, zaparkowane); wiele walut; kategorie własne; historia miesięcy; nowy test runner.

## Architektura / Podejście

Pełny pion na istniejących wzorcach startera: strona Astro SSR (chroniona przez middleware) pobiera listę miesiąca i hydratyzuje jedną wyspę React; wyspa woła `POST /parse` (serwis `expense-parser` → binding Workers AI z wymuszonym schematem JSON → normalizacja w kodzie) i po zatwierdzeniu `POST /api/expenses` (zod → insert z RLS). Model proponuje — kod waliduje — człowiek zatwierdza — baza egzekwuje własność wierszy.

## Fazy w skrócie

| Faza          | Co dostarcza                                         | Kluczowe ryzyko                                                          |
| ------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| 1. Dane       | Tabela `expenses` + RLS na hostowanym Supabase, typy | Zastosowanie migracji wymaga tokenu/dashboardu (bramka ręczna)           |
| 2. Parsowanie | Endpoint propozycji na Workers AI                    | Jakość polskiego parsu małego modelu; binding w dev przez platform proxy |
| 3. UI + zapis | Strona /expenses, pełny przepływ US-01 na dev        | Karta propozycji = pełny formularz (najwięcej UI)                        |
| 4. Wdrożenie  | Przepływ działa na produkcji                         | Cichy zepsuty build (lekcja: inspekcja dist/)                            |

**Wymagania wstępne:** konto Supabase z projektem (jest), wrangler zalogowany (jest), dostęp do Dashboardu Supabase dla migracji.
**Szacowany nakład pracy:** ~2-3 sesje w 4 fazach.

## Otwarte ryzyka i założenia

- Model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` wystarczy do polskich zdań paragonowych — jeśli nie, wymiana stałej modelu (bez zmiany architektury).
- Binding AI działa w `npm run dev` przez platform proxy zalogowanego wranglera — jeśli nie, jawne `platformProxy: { enabled: true }`.

## Kryteria sukcesu (podsumowanie)

- Pełny przepływ US-01 działa na produkcji: zdanie → propozycja → zatwierdzenie → wiersz na liście bez przeładowania.
- Wydatki są niewidoczne dla innych użytkowników (RLS zweryfikowany drugim kontem).
- Zdanie bez kwoty i awaria AI nie blokują dodania wydatku.
