<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit — Moduł 1, Lekcja 3

Szkielet projektu dla stosu wybranego w Lekcji 2, z **łańcuchem bootstrap**:

```
(/10x-init  →  /10x-shape  →  /10x-prd)  →  /10x-tech-stack-selector  →  /10x-bootstrapper
```

Łańcuch PRD pochodzi z Lekcji 1, a tech-stack-selector z Lekcji 2 — oba są ponownie uwzględnione w tej lekcji, abyś mógł poprawić PRD lub zmienić stos w trakcie pracy. `/10x-bootstrapper` to główny temat lekcji. Łańcuch kończy się tutaj w v1; przyszła Lekcja 4 skonfiguruje kontekst agenta (`CLAUDE.md`, `AGENTS.md`).

### Router zadań — Od czego zacząć

| Umiejętność | Kiedy jej użyć |
| --- | --- |
| **Bootstrap (główny temat lekcji)** | |
| `/10x-bootstrapper` | Masz przekazanie w `context/foundation/tech-stack.md` (napisane przez `/10x-tech-stack-selector`) i jesteś gotowy do utworzenia szkieletu projektu w bieżącym katalogu. Umiejętność odczytuje przekazanie, wyszukuje wybraną kartę w rejestrze starterów, uruchamia jej CLI za pomocą jednej z trzech strategii cwd (szkielet do katalogu tymczasowego, a następnie przenosi pliki w górę; szkielet bezpośrednio do bieżącego katalogu; klonuje repozytorium startera bez zachowywania jego historii git), zawsze zachowuje `context/`, odsuwa inne konflikty jako rodzeństwo `.scaffold`, uruchamia lekkie sprawdzenie aktualności przed szkieletowaniem i głębszy audyt po szkieletowaniu, a także zapisuje dziennik weryfikacji do `context/changes/bootstrap-verification/verification.md`. Użyj PO `/10x-tech-stack-selector`. |
| **Ponowne uruchomienie upstream w razie potrzeby** | |
| `/10x-init` / `/10x-shape` / `/10x-prd` / `/10x-tech-stack-selector` | Zestawione, abyś mógł poprawić PRD lub zmienić stos w trakcie pracy. Jeśli `/10x-bootstrapper` zgłosi odmowę z powodu dryfu rejestru lub zmienisz zdanie co do startera, uruchom ponownie `/10x-tech-stack-selector`, aby ponownie wygenerować `tech-stack.md` i ponownie wywołać. |

### Jak łańcuch przekazuje dane

- `/10x-tech-stack-selector` (Lekcja 2) zapisuje `context/foundation/tech-stack.md` z 4-kluczowym frontmatterem (`starter_id`, `package_manager`, `project_name`, `hints`) plus jednoparograficzną treść `## Why this stack`.
- `/10x-bootstrapper` odczytuje ten plik W CAŁOŚCI (bez powrotu do historii rozmów). Jeśli go brakuje, umiejętność odmawia z jednosentencyjnym przekierowaniem do `/10x-tech-stack-selector` i zatrzymuje się — brak wbudowanego mini-przekazania, brak trybu samodzielnego w v1.
- Wybrany `starter_id` jest wyszukiwany w `/skills/10x-tech-stack-selector/references/starter-registry.yaml`. Umiejętność konsumuje ten rejestr; nie jest jego właścicielem. Walidator CI (`scripts/validate-starter-registry-sync.mjs`) zapobiega odwoływaniu się bootstrapper'a do `starter_id` nieobecnego w rejestrze.
- Umiejętność zapisuje `context/changes/bootstrap-verification/verification.md` jako dziennik audytu dla uruchomienia. Schemat w `/skills/10x-bootstrapper/references/verification-log-schema.md`.

### Co bootstrapper przechwytuje (a czego NIE)

- **Przechwycone (v1)**: szkieletowanie za pomocą `cmd_template` wybranej karty (delegacja CLI, a nie generowanie plików wbudowanych), trzy strategie cwd wysyłane z `bootstrapper-config.yaml` (`subdir-then-move`, `native-cwd`, `git-clone`), ścisła polityka konfliktów tworząca rodzeństwo `.scaffold` + zawsze zachowująca `context/`, dwa miejsca na weryfikację (lekkie sprawdzenie aktualności przed szkieletowaniem + głęboki audyt po szkieletowaniu z uwzględnieniem języka), podsumowanie audytu z podziałem na poziomy ważności, pełny dziennik weryfikacji na dysku.
- **NIE przechwycone w v1 (celowo)**: generowanie `AGENTS.md` / `CLAUDE.md` (odłożone na przyszłą Lekcję 4 — "Architektura Pamięci"); nakładki umieszczania elementów certyfikatów dla każdego startera (będą dostępne z przyszłą umiejętnością kontekstu agenta, nie tutaj); pliki workflow CI; fallback AI-as-bridge dla stosów spoza rejestru (odłożone na v2 — w trybie łańcucha v1 tech-stack-selector już bramkuje na rejestrze, więc ten przypadek nie może wystąpić); tryb samodzielny, w którym użytkownik podaje stos wbudowany bez przekazania (odłożone na v2); działania kompensacyjne dla `bootstrapper_confidence: best-effort` lub `quality_override: true` (wyświetlane w rozmowie, ale bez automatycznego działania — to również zadanie przyszłej umiejętności architektury pamięci).

### Polityka konfliktów

Gdy umiejętność przenosi pliki z tymczasowego katalogu szkieletu do bieżącego katalogu roboczego, stosuje ścisłą matrycę:

- **`context/**`** — wszystko, co szkielet próbował zapisać w `context/`, jest **odrzucane**. Twój `context/` jest źródłem prawdy dla łańcucha bootstrap (PRD, przekazanie tech-stack, plany, ramki) i nigdy nie jest nadpisywany.
- **`.gitignore`** — scalane przez dodanie: twoje istniejące linie pozostają w kolejności, a następnie linie szkieletu są deduplikowane względem twojego zestawu i dodawane z komentarzem separatora. Semantyka ignorowania Gita jest addytywna, więc łączenie jest bezpieczne.
- **`package.json`, `README.md`, `CLAUDE.md`, `AGENTS.md`, pliki `*.md` na poziomie głównym** — twój istniejący plik wygrywa; kopia szkieletu ląduje jako rodzeństwo `<filename>.scaffold`. Możesz `diff README.md README.md.scaffold`, aby zobaczyć, co dostarczył starter, a co miałeś.
- **Cokolwiek innego** — przenosi się cicho, jeśli nie ma konfliktu, odsuwane jako `<filename>.scaffold`, jeśli taki istnieje. Matryca nigdy nie usuwa plików użytkownika.

Dla strategii `git-clone` (10x-astro-starter i podobne): sklonowany `.git/` jest usuwany przed przeniesieniem w górę, więc historia startera upstream nie wycieka do twojego repozytorium. Inicjujesz własną historię później (`git init`).

### Dziennik weryfikacji

Każde uruchomienie zapisuje `context/changes/bootstrap-verification/verification.md`. Sekcje:

- **`## Hand-off`** — dosłowna kopia frontmattera tech-stack.md i treści `## Why this stack`.
- **`## Pre-scaffold verification`** — tabela wyników aktualności (wersja pakietu npm + `time.modified` dla starterów JS; GitHub `pushed_at` dla każdego startera z GitHub `docs_url`).
- **`## Scaffold log`** — wywołanie CLI, kod wyjścia, przeniesione pliki, konflikty wyświetlone jako rodzeństwo `.scaffold`, obsługa `.gitignore`.
- **`## Post-scaffold audit`** — pełny wynik audytu dla każdego języka (`npm audit --json` dla JS, `pip-audit` dla Pythona, `cargo audit` dla Rust itp.). Podzielony na poziomy ważności: CRITICAL i HIGH wyświetlane w czacie, MODERATE i LOW tylko w dzienniku. Podział na bezpośrednie i przechodnie, jeśli narzędzie to obsługuje.
- **`## Hints recorded but not acted on`** — każda wskazówka z przekazania, którą bootstrapper odczytał, ale nie zadziałał w v1. Kompletność ścieżki audytu dla przyszłej umiejętności architektury pamięci.
- **`## Next steps`** — tekst wskazujący. v1 nazywa "twój projekt jest szkieletowany i zweryfikowany — miłego kodowania" i oznacza przyszłą umiejętność Lekcji 4 jako następne ogniwo łańcucha.

Folder (`context/changes/bootstrap-verification/`) celowo nie zawiera `change.md`. Uruchomienia bootstrap to jednorazowe artefakty, nie śledzone zmiany workflow — folder zawiera dziennik i nic więcej. Ponowne uruchomienia stosują ostrzeżenie i potwierdzenie przed nadpisaniem; wyjściem awaryjnym jest `verification-v2.md` (i tak dalej).

### Ścieżki podstawowe używane w tej lekcji

- `context/foundation/tech-stack.md` — wejście (z Lekcji 2)
- `context/changes/bootstrap-verification/verification.md` — wyjście (dziennik audytu)
- `context/foundation/lessons.md` — powtarzające się zasady i pułapki
- `docs/reference/contract-surfaces.md` — rejestr nazw nośnych

### Uniwersalny język

Dostarczona umiejętność nie zawiera odniesień do 10xDevs / kohorty / certyfikacji. Audyt po szkieletowaniu wysyła dane według `language_family` do małej tabeli wyszukiwania; kohorty, których stos ląduje w `java`, `php`, `dart` lub kombinacji wielu języków, widzą w dzienniku linię "brak wbudowanego narzędzia audytowego dla tego ekosystemu" i zalecane narzędzie zewnętrzne, a nie fałszywy rekord "0 findings".

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: "Ta zmiana jest zarchiwizowana. Zamiast tego otwórz nową zmianę za pomocą `/10x-new`."

<!-- END @przeprogramowani/10x-cli -->
