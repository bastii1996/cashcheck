# Edycja i usuwanie wydatków — Plan implementacji

## Przegląd

Fragment S-02: użytkownik może edytować każde pole zapisanego wydatku (FR-005) i usunąć wydatek z dwustopniowym potwierdzeniem w wierszu (FR-006). Domyka CRUD wymagany przez kryteria projektu.

## Analiza bieżącego stanu

- `POST /api/expenses` (zapis) i `POST /api/expenses/parse` istnieją, wzorcowe (zod, 401, RLS); brak endpointów aktualizacji/usuwania.
- Tabela `expenses` ma polityki RLS `update` i `delete` (`auth.uid() = user_id`) od migracji S-01 — backend gotowy.
- `ExpensesApp.tsx` trzyma listę w stanie i ma pełny formularz w karcie propozycji — pola do reużycia przy edycji.
- Walidator daty `isPlausibleExpenseDate` w `src/pages/api/expenses/index.ts` (po przeglądzie F3) — do reużycia.

## Pożądany stan końcowy

Na produkcji: każdy wiersz listy ma akcje Edytuj/Usuń. Edytuj rozwija wiersz w formularz (kwota/kategoria/data/opis), Zapisz aktualizuje wiersz na liście z odpowiedzi. Usuń zmienia się w „Na pewno?" (3 s), drugi klik usuwa wiersz. Cudzych wierszy nie da się tknąć (RLS + 404).

## Czego NIE robimy

- Podsumowania kategorii (S-03, osobna zmiana), cofania usunięcia, edycji zbiorczej, historii zmian wydatku.

## Podejście do implementacji

Jeden endpoint dynamiczny `/api/expenses/[id]` z `PATCH` i `DELETE` (wzorzec zod + 401 + RLS jak w istniejących endpointach; RLS gwarantuje, że dotknięcie cudzego id daje 0 wierszy → 404). UI w `ExpensesApp.tsx`: stan `editingId` + `deleteArmedId`, formularz edycji reużywa pola karty propozycji, aktualizacja listy zawsze ze zwróconego wiersza (reguła lessons.md).

## Faza 1: API — PATCH i DELETE /api/expenses/[id]

### Wymagane zmiany:

#### 1. Endpoint dynamiczny

**Plik**: `src/pages/api/expenses/[id].ts` (nowy)

**Cel**: Trwała aktualizacja i usuwanie własnych wydatków.

**Kontrakt**: `prerender = false`. `PATCH`: `id` z params (zod uuid), body = `CreateExpenseCommand` (ten sam schemat co zapis, z walidatorem daty); `update ... eq('id', id).select().single()`; brak wiersza (RLS/nie istnieje) → 404; `200` + zaktualizowany wiersz. `DELETE`: `delete().eq('id', id).select()`; pusta odpowiedź → 404; sukces → `204`. Oba: 401 bez `locals.user`, 500 gdy `createClient` null. Wydziel wspólny schemat/walidator z `index.ts` (np. eksport z `index.ts` lub mały moduł `src/lib/services/expense-schema.ts` — wybór implementatora, bez duplikacji).

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- `npm run lint` + `npx astro check` przechodzą
- Dev: PATCH/DELETE bez sesji → 401; PATCH złego uuid → 400; PATCH/DELETE nieistniejącego uuid → 404
- Dev z sesją: PATCH zmienia kwotę (200 + wiersz), DELETE usuwa (204)

#### Weryfikacja ręczna:

- (brak — endpointy w pełni testowalne przez curl)

---

## Faza 2: UI + wdrożenie

### Wymagane zmiany:

#### 1. Akcje wiersza

**Plik**: `src/components/expenses/ExpensesApp.tsx`

**Cel**: Edycja w miejscu i dwustopniowe usuwanie; lista aktualizowana z odpowiedzi.

**Kontrakt**: przy każdym wierszu przyciski Edytuj/Usuń. Edytuj → wiersz rozwija się w formularz (te same pola i walidacja co karta propozycji; przyciski Zapisz/Anuluj); `PATCH` → podmiana wiersza w stanie ze zwróconego JSON. Usuń → przycisk zmienia się w „Na pewno?" na ~3 s (timer resetuje stan); drugi klik → `DELETE` → usunięcie wiersza ze stanu po 204. Stany `busy` blokują podwójne wysłanie. Duże pola dotykowe (mobile NFR).

#### 2. Wdrożenie

**Kontrakt**: build + inspekcja `dist/` → `wrangler deploy` → smoke na produkcji (401/404/pełny cykl edycji i usunięcia kontem testowym) → push (CI zielone).

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Lint + check + build przechodzą; deploy OK
- Produkcja: PATCH/DELETE bez sesji → 401; cykl edycja+usunięcie kontem testowym działa (skrypt Node)
- CI zielone po pushu

#### Weryfikacja ręczna:

- W przeglądarce: edycja wydatku zmienia wiersz bez przeładowania; usunięcie wymaga drugiego kliku i zdejmuje wiersz
- Widok mobilny (375px) wygodny

## Strategia testowania

Bez test runnera (reguła AGENTS.md) — curl/Node smoke na dev i produkcji + testy ręczne w przeglądarce.

## Referencje

- Roadmapa S-02; PRD FR-005/FR-006; wzorce: `src/pages/api/expenses/index.ts`, `ExpensesApp.tsx`

## Postęp

> Konwencja: `- [ ]` oczekujące, `- [x]` wykonane. Dodaj ` — <commit sha>` po zakończeniu kroku.

### Faza 1: API — PATCH i DELETE /api/expenses/[id]

#### Automatyczne

- [x] 1.1 Lint + astro check przechodzą — bf65def
- [x] 1.2 401/400/404 na dev zgodnie z kontraktem — bf65def
- [x] 1.3 PATCH i DELETE działają z sesją na dev — bf65def

### Faza 2: UI + wdrożenie

#### Automatyczne

- [x] 2.1 Lint + check + build + deploy przechodzą
- [x] 2.2 Produkcyjne smoke (401 + cykl edycji/usunięcia) przechodzą
- [ ] 2.3 CI zielone po pushu

#### Ręczne

- [ ] 2.4 Edycja w miejscu i dwustopniowe usuwanie działają w przeglądarce
- [ ] 2.5 Widok mobilny wygodny
