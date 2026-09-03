Project rules live in @AGENTS.md — read it first. The block below is course-lesson tooling managed by 10x-cli.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Moduł 2, Lekcja 3

Przejrzyj kod wygenerowany przez AI przed scaleniem za pomocą **łańcucha przeglądu implementacji**:

```
/10x-implement -> /10x-impl-review -> triage -> (/10x-lesson | fix | skip | disagree)
```

`/10x-impl-review` to główny temat lekcji. Przegląd jest bramką jakości, a nie instrukcją do naprawienia każdego znalezionego problemu.

### Router zadań - Od czego zacząć

| Umiejętność                             | Użyj, gdy                                                                                                                                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Przegląd kodu (główny temat lekcji)** |                                                                                                                                                                                                                                                                           |
| `/10x-impl-review <change-id>`          | Zaimplementowałeś kod i chcesz przeprowadzić ustrukturyzowany przegląd przed scaleniem. Umiejętność sprawdza zgodność z planem, dyscyplinę zakresu, bezpieczeństwo i jakość, architekturę, spójność wzorców i kryteria sukcesu, a następnie przedstawia wyniki do triażu. |
| **Powtarzający się wynik lekcji**       |                                                                                                                                                                                                                                                                           |
| `/10x-lesson`                           | Znaleziony problem ujawnia powtarzającą się regułę projektu lub wzorzec błędu agenta. Zapisz go w `context/foundation/lessons.md` zamiast traktować jako jednorazową notatkę.                                                                                             |

### Dyscyplina triażu

- Ważność mówi, jak zły jest problem. Wpływ mówi, jak ważna jest decyzja teraz.
- Prawidłowe wyniki: napraw teraz, napraw inaczej, pomiń, zaakceptuj jako ryzyko, zapisz jako powtarzającą się regułę (`/10x-lesson`), nie zgadzam się.
- Napraw krytyczne problemy. Nie marnuj godzin na obserwacje o niskim wpływie tylko dlatego, że agent je znalazł.
- Świadome pomijanie problemów o niskim wpływie jest prawidłowym wynikiem przeglądu, a nie zaniedbaniem.
- Jeśli nie zgadzasz się z problemem, zapisz dlaczego. Błędne rozumowanie agenta również jest sygnałem.

### Granice przeglądu

- Ta lekcja dotyczy przeglądu zaimplementowanego kodu. Nie tworzy planu, nie wykonuje nowych faz ani nie uczy przeglądu CI.
- Strategia testowania i bramki jakości zostaną wprowadzone w Module 3.
- Nie używaj `/10x-contract` jako wyniku triażu w tej lekcji.

### Ścieżki używane w tej lekcji

- `context/changes/<change-id>/plan.md` - oczekiwana umowa implementacji
- `context/changes/<change-id>/reviews/` - wynik przeglądu
- `context/foundation/lessons.md` - powtarzające się lekcje

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
