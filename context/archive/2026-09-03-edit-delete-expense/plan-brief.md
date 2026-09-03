# Edycja i usuwanie wydatków — Krótki plan

> Pełny plan: `context/changes/edit-delete-expense/plan.md`

## Co i dlaczego

S-02 domyka CRUD (FR-005/FR-006): edycja każdego pola wydatku i usuwanie z ochroną przed przypadkowym kliknięciem.

## Punkt wyjścia

S-01 wdrożone: tabela z politykami RLS `update`/`delete` już istnieje, formularz pól wydatku już jest w karcie propozycji, lista żyje w stanie wyspy React.

## Kluczowe podjęte decyzje

| Decyzja            | Wybór                                                | Dlaczego                                                         | Źródło  |
| ------------------ | ---------------------------------------------------- | ---------------------------------------------------------------- | ------- |
| Endpoint           | Jeden dynamiczny `/api/expenses/[id]` (PATCH+DELETE) | Wzorzec zod+401+RLS jak w istniejących; cudzy id = 404 przez RLS | Plan    |
| Edycja UX          | Wiersz rozwija się w formularz                       | Reużycie pól karty propozycji (ryzyko z roadmapy)                | Wywiad  |
| Usuwanie UX        | Dwustopniowe w wierszu („Na pewno?", 3 s)            | Ochrona przed przypadkowym tapnięciem bez modala                 | Wywiad  |
| Aktualizacja listy | Zawsze ze zwróconego wiersza / 204                   | Reguła lessons.md (bez refetchu)                                 | Lessons |

## Fazy w skrócie

| Faza           | Dostarcza                               | Ryzyko                                        |
| -------------- | --------------------------------------- | --------------------------------------------- |
| 1. API         | PATCH/DELETE z pełnym kontraktem błędów | wydzielenie wspólnego schematu bez duplikacji |
| 2. UI + deploy | akcje wiersza, produkcja, CI            | rosnący stan komponentu                       |

## Kryteria sukcesu (podsumowanie)

Na produkcji: edycja zmienia wiersz bez przeładowania, usunięcie wymaga drugiego kliku; cudze wiersze nietykalne (401/404).
