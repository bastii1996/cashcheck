Project rules live in @AGENTS.md — read it first. The block below is course-lesson tooling managed by 10x-cli.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Moduł 2, Lekcja 5

Skaluj cykl pojedynczych zmian do pracy równoległej za pomocą **worktrees, delegowania ukierunkowanego na cel i orkiestracji wielu sesji**:

```
worktree per change -> /goal or claude -p -> PR -> review -> merge
```

Lekcja koncentruje się na bezpiecznej przepustowości: izolowanych kontekstach, wyborze odpowiedniego trybu wykonania i ograniczeniu równoległości do zdolności przeglądu.

### Router zadań - Od czego zacząć

| Umiejętność                                             | Kiedy jej używać                                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Izolacja kodu**                                       |                                                                                                                                                               |
| `git worktree add`                                      | Potrzebujesz oddzielnego katalogu roboczego dla równoległej zmiany. Jedna zmiana na worktree, jeden świeży kontekst agenta na worktree.                       |
| **Złożone zmiany**                                      |                                                                                                                                                               |
| `/10x-implement <change-id> phase <n>`                  | Zmiana ma wiele faz, wymaga ręcznych bramek lub korzysta z interaktywnego podejmowania decyzji podczas wykonania.                                             |
| **Proste zmiany**                                       |                                                                                                                                                               |
| `/goal`                                                 | Masz jasne, ograniczone zadanie i chcesz delegowania ukierunkowanego na cel. Agent pracuje autonomicznie w kierunku określonego celu z warunkiem zatrzymania. |
| `claude -p`                                             | Chcesz bezgłowego wykonania dla dobrze zdefiniowanego zadania. Pętla Ralpha Wigguma (uruchom, sprawdź, spróbuj ponownie) to uniwersalny autonomiczny wzorzec. |
| **Orkiestracja wielu sesji**                            |                                                                                                                                                               |
| Superset / Conductor / Antigravity / VS Code Agent View | Uruchamiasz wiele sesji agentów równolegle i potrzebujesz widoczności, koordynacji lub zarządzania sesjami między nimi.                                       |

### Zasady pracy równoległej

- Jedna zmiana na worktree lub izolowany obszar roboczy. Jeden świeży kontekst agenta na zmianę.
- Wybierz interaktywne `/10x-implement` dla złożonych zmian, `/goal` lub `claude -p` dla prostych.
- Równoległość jest ograniczona przez zdolność przeglądu. Więcej agentów bez przeglądu oznacza więcej nieprzejrzanego kodu, a nie wyższą przepustowość.
- Ból jakości wynikający z szybszej wysyłki jest celowy — łączy się z bramkami testowymi Modułu 3.

### Granice lekcji

- Nie ucz ponownie interaktywnego `/10x-implement` ani `/10x-impl-review`; to są Lekcje 2 i 3.
- Nie wprowadzaj tutaj strategii testowania. Ból jakości jest motywacją dla Modułu 3.
- Worktrees to mechanizm izolacji, a nie temat pełnego samouczka git.

### Ścieżki używane w tej lekcji

- `context/changes/<change-id>/` - aktywny folder zmian
- `context/changes/<change-id>/plan.md` - dane wejściowe implementacji dla dowolnego trybu wykonania

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: "Ta zmiana jest zarchiwizowana. Zamiast tego otwórz nową zmianę za pomocą `/10x-new`."

<!-- END @przeprogramowani/10x-cli -->
