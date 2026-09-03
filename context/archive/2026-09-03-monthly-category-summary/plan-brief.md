# Podsumowanie miesiąca wg kategorii — Krótki plan

> Pełny plan: `context/changes/monthly-category-summary/plan.md`

## Co i dlaczego

S-03 (FR-007), ostatni fragment kamienia milowego M-1: tabela sum bieżącego miesiąca wg kategorii + ŁĄCZNIE, nad listą, licząca się na żywo — domyka kryterium akceptacji US-01 („suma miesiąca rośnie").

## Kluczowe podjęte decyzje

| Decyzja       | Wybór                                             | Dlaczego                                         | Źródło     |
| ------------- | ------------------------------------------------- | ------------------------------------------------ | ---------- |
| Miejsce       | Sekcja na /expenses nad listą                     | Jedna strona, suma rośnie natychmiast po zapisie | Wywiad     |
| Kształt       | Prosta tabela kategoria→kwota + ŁĄCZNIE, malejąco | PRD: „bieżący miesiąc w prostej tabeli"          | Wywiad/PRD |
| Źródło danych | Agregacja useMemo ze stanu wyspy                  | Zero nowych endpointów; żywe przy każdej mutacji | Plan       |

## Fazy w skrócie

| Faza               | Dostarcza                    | Ryzyko                                                    |
| ------------------ | ---------------------------- | --------------------------------------------------------- |
| 1. Sekcja + deploy | żywa tabela sum na produkcji | zaokrąglenia groszy (liczyć na zaokrąglonych do 2 miejsc) |

## Kryteria sukcesu (podsumowanie)

Sumy zgodne z listą i zmieniające się bez przeładowania przy dodaniu/edycji/usunięciu.
