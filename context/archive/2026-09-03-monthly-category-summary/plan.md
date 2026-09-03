# Podsumowanie miesiąca wg kategorii — Plan implementacji

## Przegląd

Fragment S-03 (FR-007): nad listą wydatków pojawia się prosta tabela sum bieżącego miesiąca wg kategorii + wiersz ŁĄCZNIE, licząca się na żywo ze stanu listy — suma rośnie natychmiast po zapisie/edycji/usunięciu (kryterium akceptacji US-01). Domyka kamień milowy M-1.

## Analiza bieżącego stanu

`ExpensesApp.tsx` trzyma pełną listę bieżącego miesiąca w stanie React (po S-02 aktualizowaną także przy edycji/usuwaniu) — agregacja po stronie klienta nie wymaga żadnego endpointu ani zapytania.

## Pożądany stan końcowy

Na produkcji sekcja „Ten miesiąc wg kategorii": wiersze kategoria→kwota (tylko kategorie z wydatkami, malejąco po kwocie), na dole ŁĄCZNIE. Po dodaniu/edycji/usunięciu wydatku sumy zmieniają się bez przeładowania.

## Czego NIE robimy

- Historii miesięcy, wykresów, filtrów (Non-Goals PRD), osobnego endpointu agregacji.

## Podejście do implementacji

Czysta pochodna stanu: `useMemo` po `expenses` → mapa kategoria→suma + suma całkowita; render prostej tabeli nad listą. Zero zmian w API i danych.

## Faza 1: Sekcja podsumowania + wdrożenie

### Wymagane zmiany:

#### 1. Agregacja i tabela

**Plik**: `src/components/expenses/ExpensesApp.tsx`

**Cel**: FR-007 — sumy miesiąca wg kategorii widoczne i żywe.

**Kontrakt**: pochodna (useMemo) z `expenses`: `[{category, total}]` malejąco po total (grosze liczone na liczbach całkowitych lub zaokrąglane do 2 miejsc) + `grandTotal`; sekcja renderowana tylko gdy lista niepusta; formatowanie `plnFormatter`; styl spójny (tabela/karty glass).

#### 2. Wdrożenie

**Kontrakt**: lint+check+build → deploy → weryfikacja produkcyjna → push.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Lint + check + build + deploy przechodzą; CI zielone po pushu
- Produkcja: strona /expenses zawiera sekcję podsumowania z kwotami zgodnymi z listą (skrypt Node kontem testowym)

#### Weryfikacja ręczna:

- Po dodaniu wydatku suma kategorii i ŁĄCZNIE rosną bez przeładowania; po usunięciu maleją
- Widok mobilny wygodny

## Strategia testowania

Bez test runnera — smoke Node na produkcji + ręczna weryfikacja żywych sum.

## Referencje

- Roadmapa S-03; PRD FR-007, US-01 AC; `ExpensesApp.tsx`

## Postęp

> Konwencja: `- [ ]` oczekujące, `- [x]` wykonane. Dodaj ` — <commit sha>` po zakończeniu kroku.

### Faza 1: Sekcja podsumowania + wdrożenie

#### Automatyczne

- [x] 1.1 Lint + check + build + deploy przechodzą — 1a07168
- [x] 1.2 Produkcyjna weryfikacja sekcji podsumowania (zgodność sum z listą) — 1a07168
- [x] 1.3 CI zielone po pushu — 1a07168

#### Ręczne

- [x] 1.4 Sumy żywe przy dodaniu/edycji/usunięciu bez przeładowania — 1a07168
- [x] 1.5 Widok mobilny wygodny — 1a07168
