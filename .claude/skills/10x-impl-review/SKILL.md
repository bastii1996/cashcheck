---
name: 10x-impl-review
description: Review implementation against plan for drift, dangerous decisions, and pattern compliance
argument-hint: <plan-path> [phase N] | <saved-review-path>
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - Agent
  - AskUserQuestion
  - TaskCreate
  - TaskUpdate
  - TaskList
  - TaskGet
---

# Przegląd implementacji

Porównaj rzeczywistą pracę implementacyjną z oryginalnym planem, aby wychwycić odchylenia, niebezpieczne decyzje, naruszenia architektury i niewłaściwe użycie wzorców, zanim się skumulują.

Dwie ziarnistości:

- **Przegląd fazy**: po pojedynczej fazie — szybki, skupiony na zmianach w tej fazie
- **Pełny przegląd planu**: po wszystkich fazach — kompleksowe sprawdzenie

Dwa tryby:

- **Świeży przegląd**: analiza → ustalenia → interaktywne sortowanie
- **Wznowienie sortowania**: załaduj zapisany raport i przejdź do sortowania poszczególnych problemów

## Rozwiązanie wejścia

1. Argument wskazuje na zapisany plik przeglądu (zawiera `<!-- IMPL-REVIEW-REPORT -->`) → **wznowienie sortowania** (przejdź do kroku 5)
2. Argument to `<change-id>` i istnieje `context/changes/<change-id>/plan.md` → świeży przegląd tego planu
3. Podana ścieżka planu (np. `@context/changes/<change-id>/plan.md`) → świeży przegląd tego planu
4. Podany numer fazy (np. "faza 3") → przegląd tylko tej fazy
5. Brak argumentu → wylicz `context/changes/*/change.md`; wybierz ostatnio `updated` zmianę ze `status` w `{implementing, implemented}` i potwierdź za pomocą AskUserQuestion

Jeśli rozwiązana ścieżka planu zaczyna się od `context/archive/`, odmów: wydrukuj "Ta zmiana jest zarchiwizowana. Przeglądy nie są dołączane do zarchiwizowanych planów." i ZATRZYMAJ.

## Krok 1: Załaduj plan i wykryj zakres zmian

TaskCreate: "Przegląd implementacji" / activeForm "Ładowanie kontekstu"

1. **Wczytaj cały plik planu** — bez limitu/offsetu.
2. **Wczytaj `context/foundation/lessons.md` jeśli istnieje** i użyj zaakceptowanych reguł jako priorytetów podczas skanowania w poszukiwaniu ustaleń — odchylenie, które narusza znaną, powtarzającą się regułę, jest silniejszym sygnałem niż ogólna uwaga stylistyczna.
3. **Wczytaj kanoniczny stan z sekcji `## Progress` planu** (patrz `references/progress-format.md`): ukończenie = `count([x]) / count([ ] + [x])`; bieżąca faza = faza zawierająca pierwszy `- [ ]` (lub ostatnia faza, jeśli wszystkie są ukończone). Wczytaj również sąsiedni `change.md` dla `status` i `updated`.
4. **Zakres**: żądana konkretna faza → tylko ta faza; w przeciwnym razie wszystkie fazy, których pola wyboru postępu są w pełni `[x]` (tj. ukończone fazy).
5. **Wyodrębnij** z przeglądanych faz: ścieżki plików z "Wymagane zmiany", decyzje architektoniczne, kryteria sukcesu (punkty automatyczne/ręczne w blokach faz + ich lustrzane odbicie `[ ]`/`[x]` w postępie) oraz listę "Czego NIE robimy" (ograniczenia zakresu).
6. **Wykrywanie zakresu Git** — co faktycznie się zmieniło:
   ```bash
   PLAN_DATE="<YYYY-MM-DD z nazwy pliku>"
   git log --oneline --after="${PLAN_DATE}" -- .
   git diff --name-only $(git log --reverse --after="${PLAN_DATE}" --format="%H" | head -1)^..HEAD 2>/dev/null
   ```
   Jeśli zakres nie może być czysto określony, wróć do commitów, których komunikaty odwołują się do planu/funkcji.

Porównaj listę zmienionych plików z listą plików planu:

- **W planie ORAZ w diffie** → oczekiwana zmiana, zweryfikuj zgodność treści z zamierzeniem
- **W diffie, ale NIE w planie** → nieplanowana zmiana, zbadaj i oznacz
- **W planie, ale NIE w diffie** → potencjalnie brakująca implementacja

Nie wczytuj każdego zmienionego pliku do głównego kontekstu — pozwól pod-agentom wczytać to, czego potrzebują. Główny kontekst powinien zawierać plan i podsumowanie diffa, a nie pełne źródło 20 plików.

## Krok 2: Równoległy przegląd za pomocą pod-agentów

TaskUpdate: activeForm "Zbieranie dowodów"

Uruchom **dwóch** pod-agentów jednocześnie. Każdy otrzymuje ukierunkowany kontekst — nie wrzucaj całego planu do obu.

**Agent 1 — Wykrywanie odchyleń od planu** (`subagent_type: "general-purpose"`)

Daj mu: tekst "Wymagane zmiany" dla przeglądanych faz, listę ścieżek plików do odczytania.

Instrukcje: dla każdej zaplanowanej zmiany, przeczytaj rzeczywisty plik i zweryfikuj zgodność implementacji z zamierzeniem. Sprawdź:

- Zmiany zaimplementowane inaczej niż zaplanowano (niezgodność intencji, nie formatowania)
- Zaplanowane elementy pominięte bez dokumentacji
- Dodatki nieopisane w planie (rozszerzenie zakresu)

Zgłoś każdy: ścieżka pliku, co mówił plan, co istnieje, werdykt (MATCH / DRIFT / MISSING / EXTRA).

**Agent 2 — Bezpieczeństwo, jakość i zgodność ze wzorcami** (`subagent_type: "general-purpose"`)

Daj mu: pełną listę zmienionych plików do odczytania, ścieżkę katalogu głównego projektu.

Instrukcje:

1. **Skanowanie bezpieczeństwa i jakości** na każdym zmienionym pliku. Oznacz:
   - **Bezpieczeństwo**: ryzyka wstrzyknięcia (SQL, polecenia, XSS), zakodowane na stałe sekrety, brak autentykacji/autoryzacji na granicach systemu, zbyt liberalne CORS/uprawnienia.
   - **Wydajność**: zapytania N+1, nieograniczone iteracje/rekurencje, brak paginacji, niepotrzebne synchroniczne I/O.
   - **Niezawodność**: brak obsługi błędów na zewnętrznych granicach (wywołania API, I/O plików, DB), warunki wyścigu, wycieki zasobów.
   - **Bezpieczeństwo danych**: destrukcyjne operacje DB bez rollbacku, zmiany schematu bez ścieżki migracji, potencjalna utrata danych.

2. **Zgodność ze wzorcami** — dla każdego zmienionego pliku znajdź 1-2 podobne istniejące pliki i porównaj nazewnictwo, podejście do obsługi błędów, strukturę modułów, importy/eksporty, strukturę testów, wzorce konfiguracji. **Zgłaszaj tylko istotne niezgodności** (np. nowy moduł używa camelCase, gdzie sąsiednie używają snake_case; nowy endpoint pomija wzorzec middleware autoryzacji, którego używa reszta API). Pomiń trywialne różnice stylistyczne — jeśli kod działa i jest zgodny z planem, drobne formatowanie nie jest ustaleniem.

3. **Dostosuj pracę nad wzorcami do zakresu** — jeśli diff zmienił ≤3 pliki, poświęć minimalny czas na wzorce (niewiele do porównania). Skaluj głębokość wzorców wraz z zakresem zmian.

Zgłoś każde ustalenie z: plikiem, numerem linii, kategorią, ważnością (CRITICAL / WARNING / OBSERVATION), opisem, rekomendacją.

## Krok 3: Zweryfikuj kryteria sukcesu

TaskUpdate: activeForm "Weryfikacja kryteriów sukcesu"

Dla każdej przeglądanej fazy:

**Automatyczne**: uruchom każde polecenie z pól wyboru "Automatyczna weryfikacja" za pomocą Bash. Zapisz polecenie, wynik (pass/fail), rzeczywiste wyjście (obetnij, jeśli jest ogromne).

**Ręczne**: w sekcji `## Progress` sprawdź elementy ręczne jako `- [x]` vs `- [ ]`. Oznacz elementy oznaczone jako ukończone, które nie mają widocznych dowodów w diffie (możliwe "podpisywanie na ślepo"); uznaj niezaznaczone elementy za oczekujące.

## Krok 4: Skompiluj ustalenia i przedstaw raport

TaskUpdate: activeForm "Kompilowanie ustaleń"

Każde ustalenie ma:

- **ID**: F1, F2, F3…
- **Ważność**: CRITICAL / WARNING / OBSERVATION (jak źle, jeśli zignorowane)
- **Wpływ**: LOW / MEDIUM / HIGH (ile uwagi wymaga decyzja)
- **Wymiar**: Zgodność z planem / Dyscyplina zakresu / Bezpieczeństwo i jakość / Architektura / Spójność wzorców / Kryteria sukcesu
- **Tytuł**: jedna linia
- **Lokalizacja**: `plik:linia` (lub "N/A" dla brakujących elementów)
- **Szczegóły**: co jest nie tak z dowodami — plan vs. rzeczywistość, lub kod vs. oczekiwania
- **Opcje naprawy**: 1 lub 2 (patrz poniżej)

### Wpływ

Ortogonalny do ważności. CRITICAL z LOW wpływem (oczywista jednowierszowa poprawka) jest tania; WARNING z HIGH wpływem (przebudowa architektury) wymaga starannego przemyślenia.

| Wpływ         | Znaczenie                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| 🏃 **NISKI**  | Szybka decyzja. Poprawka jest oczywista i wąsko zakrojona. Bezpieczne do grupowania.                      |
| 🔎 **ŚREDNI** | Warto się zatrzymać. Prawdziwy kompromis lub nietrywialna edycja — pomyśl przed podjęciem decyzji.        |
| 🔬 **WYSOKI** | Stawka architektoniczna. Szeroki promień rażenia, strategiczne implikacje lub niejasna najlepsza ścieżka. |

### Opcje naprawy

Domyślnie **jedna** poprawka. Oferuj dwie tylko wtedy, gdy istnieje prawdziwy kompromis, który inteligentny recenzent chciałby rozważyć (np. "załataj miejsce wywołania" vs. "napraw to u źródła"). Jeśli wymyślasz słabą drugą opcję, nie rób tego — przedstaw jedną i idź dalej.

**Ustalenia o NISKIM wpływie**: tylko `Fix: [jedna linia]`. Hałas nie jest pomocny, gdy odpowiedź jest oczywista.

**Ustalenia o ŚREDNIM/WYSOKIM wpływie**: każda opcja otrzymuje:

```
[1-zdaniowe podejście] · Siła: [zaleta, najlepiej oparta na dowodach z kodu/planu] · Kompromis: [koszt lub ryzyko] · Pewność: HIGH|MED|LOW — [1-liniowe dlaczego] · Martwy punkt: [czego nie zweryfikowaliśmy, lub "Brak znaczących"]
```

Oferując dwie opcje, oznacz dokładnie jedną `⭐ Zalecane`.

### Werdykty wymiarów

PASS / WARNING / FAIL na wymiar:

- **Zgodność z planem** — zaplanowane zmiany zaimplementowane zgodnie z opisem? FAIL w przypadku MISSING lub poważnego DRIFT.
- **Dyscyplina zakresu** — granice "nie robimy" przestrzegane? WARNING, jeśli istnieją EXTRA zmiany, ale są nieszkodliwe.
- **Bezpieczeństwo i jakość** — bezpieczeństwo, wydajność, niezawodność, bezpieczeństwo danych. FAIL w przypadku każdego ustalenia CRITICAL.
- **Architektura** — granice modułów, kierunek zależności, uzasadnienie abstrakcji. FAIL w przypadku naruszeń.
- **Spójność wzorców** — zgodność z istniejącymi konwencjami. WARNING w przypadku drobnych niespójności.
- **Kryteria sukcesu** — automatyczne testy przechodzą, ręczne testy zaadresowane. FAIL w przypadku automatycznych błędów.

### Ogólny werdykt

- **ZAAKCEPTOWANO** — wszystkie PASS, lub PASS z ≤2 drobnymi ostrzeżeniami
- **WYMAGA UWAGI** — wiele ostrzeżeń lub 1 niekrytyczny FAIL
- **ODRZUCONO** — każdy krytyczny FAIL (bezpieczeństwo, poważne odchylenie, bezpieczeństwo danych, nieudane testy)

Sortuj ustalenia według ważności: CRITICAL → WARNING → OBSERVATION. Ogranicz do 10 — skonsoliduj powiązane ustalenia, jeśli jest ich więcej.

### Format raportu

Zwykły tekst, rysowanie ramek. Wymiary PASS pojawiają się tylko w tabeli werdyktów, nigdy jako ustalenia. Pomiń grupy ważności z zerową liczbą ustaleń.

```
═══════════════════════════════════════════════════════════
  PRZEGLĄD IMPLEMENTACJI: [Tytuł planu]
  Zakres: Faza [N] z [Całkowita]  |  Data: RRRR-MM-DD
  Ustalenia: [N krytycznych] [N ostrzeżeń] [N obserwacji]
═══════════════════════════════════════════════════════════

  Zgodność z planem        PASS    ✅
  Dyscyplina zakresu      WARNING ⚠️   (1 ustalenie)
  Bezpieczeństwo i jakość      FAIL    ❌   (1 ustalenie)
  Architektura          PASS    ✅
  Spójność wzorców   WARNING ⚠️   (1 ustalenie)
  Kryteria sukcesu      PASS    ✅

  ► Ogólnie: WYMAGA UWAGI

═══════════════════════════════════════════════════════════
  KRYTYCZNE USTALENIA ❌
═══════════════════════════════════════════════════════════

  F1 — Wstrzyknięcie SQL w obsłudze autoryzacji
  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
    Ważność:  ❌ KRYTYCZNE
    Wpływ:    🔎 ŚREDNI — prawdziwy kompromis; zatrzymaj się, aby to przemyśleć
    Wymiar: Bezpieczeństwo i jakość
    Lokalizacja:  src/auth/handler.ts:42

    Szczegóły:
    Zapytanie SQL zbudowane z konkatenacji ciągów. Plan określał
    zapytania parametryzowane, ale implementacja używa literałów szablonowych.

    Poprawka: Zastąp literał szablonowy zapytaniem parametryzowanym używając
         db.query($1, [value]).
      Siła:   Pasuje do wzorca w src/users/query.ts i całkowicie usuwa
                  klasę wstrzyknięcia.
      Kompromis:   Drobny — jedno miejsce wywołania, zmiana kilku linii.
      Pewność:   WYSOKA — identyczny wzorzec używany gdzie indziej w tym repozytorium.
      Martwy punkt: Brak znaczących.

═══════════════════════════════════════════════════════════
  OSTRZEŻENIA ⚠️
═══════════════════════════════════════════════════════════

  F2 — Nieplanowany endpoint /api/status
  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
    Ważność:  ⚠️ OSTRZEŻENIE
    Wpływ:    🔬 WYSOKI — stawka architektoniczna; pomyśl dokładnie przed podjęciem decyzji
    Wymiar: Dyscyplina zakresu
    Lokalizacja:  src/api/routes.ts:18

    Szczegóły:
    Nowy endpoint GET /api/status nie jest w planie. Funkcjonalność jest
    związana z zaplanowaną pracą, ale rozszerza publiczną powierzchnię API.

    Poprawka A ⭐ Zalecane: Udokumentuj w planie jako dodatek
      Siła:   Zachowuje już wykonaną pracę; aktualizuje źródło
                  prawdy, zanim przyszłe przeglądy użyją planu jako podstawy.
      Kompromis:   Plan staje się nieco ruchomym celem.
      Pewność:   WYSOKA — aktualizacje planu tego repozytorium regularnie uwzględniają
                  odkryty zakres poprzez dodatki.
      Martwy punkt: Zainteresowane strony, które przeglądały pierwotny zakres, nie są
                  powiadamiane.

    Poprawka B: Usuń i dodaj do dalszych prac
      Siła:   Utrzymuje ścisłą dyscyplinę zakresu.
      Kompromis:   Traci zaimplementowaną pracę; później potrzebny będzie kolejny PR.
      Pewność:   ŚREDNIA — zależy, czy coś już od tego zależy.
      Martwy punkt: Nie sprawdzono wywołań /api/status.

  ···

  F3 — camelCase vs. snake_case
  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
    Ważność:  ⚠️ OSTRZEŻENIE
    Wpływ:    🏃 NISKI — szybka decyzja; poprawka jest oczywista i wąsko zakrojona
    Wymiar: Spójność wzorców
    Lokalizacja:  src/utils/format.ts

    Szczegóły:
    Używa camelCase (formatDate, parseInput), podczas gdy istniejące narzędzia używają
    snake_case (format_date, parse_input).

    Poprawka: Zmień nazwy eksportów na snake_case, aby pasowały do src/utils/.

═══════════════════════════════════════════════════════════
```

### Zasady formatowania raportu

- **Linia tytułu ustalenia** zawiera tylko ID i krótki tytuł — nic więcej. Wszystko inne znajduje się poniżej jako oznaczone pola, dzięki czemu każdy wiersz jest krótki i łatwy do skanowania.
- **Zawsze łącz ikony ze słowem.** Nigdy nie używaj samej ikony jako jedynego sygnału — `❌ KRYTYCZNE`, a nie tylko `❌`. Dzięki temu raport jest czytelny podczas przeglądania i nie zmusza użytkownika do zapamiętywania znaczenia każdej ikony.
- **Wpływ zawsze zawiera swoje jednowierszowe znaczenie** (skopiuj z tabeli Wpływ — "stawka architektoniczna; pomyśl dokładnie przed podjęciem decyzji" / "prawdziwy kompromis; zatrzymaj się, aby to przemyśleć" / "szybka decyzja; poprawka jest oczywista i wąsko zakrojona"). Dzięki temu LOW/MEDIUM/HIGH są samoobjaśniające w miejscu użycia, zamiast polegać na tym, że użytkownik zapamięta tabelę.
- Ważność, Wpływ, Wymiar, Lokalizacja są każdy w osobnej linii z wyrównanymi etykietami. Szczegóły zaczynają się w osobnej linii pod etykietą `Detail:`, dzięki czemu mogą naturalnie zawijać się.

### Zapisywanie raportu (zawsze)

**Każda ścieżka przez tę umiejętność utrwala raport i oznacza zmianę** — Triage teraz, Triage później i Gotowe wszystkie zapisują plik. To pozwala `/10x-archive` i `/10x-status` zobaczyć przegląd i utrzymuje poprawność `change.md.status`. Zrób to _przed_ przedstawieniem opcji kontynuacji — nigdy warunkowo i nigdy tylko na gałęziach "zapisz".

1. **Zapisz plik raportu** do `context/changes/<change-id>/reviews/impl-review.md` (lub `context/changes/<change-id>/reviews/impl-review-phase-N.md` dla przeglądu ograniczonego do fazy), używając poniższego formatu. Utwórz katalog `reviews/`, jeśli nie istnieje.
2. **Oznacz `change.md`**: ustaw `status: impl_reviewed` i `updated: <dzisiaj>`. Raz, tutaj — niezależnie od tego, którą opcję kontynuacji wybierze użytkownik. (Jeśli pole `change.md` jest już `impl_reviewed`, po prostu odśwież `updated`.)
3. Jeśli użytkownik później sortuje, raport na dysku jest kopią roboczą: jego pola `Decision:` są aktualizowane na miejscu, gdy każde ustalenie jest rozstrzygane (Krok 5), a wszelkie dalsze działania "napraw w planie/kodzie" są kolejkowane do `context/changes/<change-id>/follow-ups/review-fixes.md`.

```markdown
<!-- IMPL-REVIEW-REPORT -->

# Przegląd implementacji: [Tytuł planu]

- **Plan**: [ścieżka pliku planu]
- **Zakres**: Faza [N] z [Całkowita]
- **Data**: RRRR-MM-DD
- **Werdykt**: [ZAAKCEPTOWANO/WYMAGA UWAGI/ODRZUCONO]
- **Ustalenia**: [N krytycznych] [N ostrzeżeń] [N obserwacji]

## Werdykty

| Wymiar                  | Werdykt           |
| ----------------------- | ----------------- |
| Zgodność z planem       | PASS/WARNING/FAIL |
| Dyscyplina zakresu      | PASS/WARNING/FAIL |
| Bezpieczeństwo i jakość | PASS/WARNING/FAIL |
| Architektura            | PASS/WARNING/FAIL |
| Spójność wzorców        | PASS/WARNING/FAIL |
| Kryteria sukcesu        | PASS/WARNING/FAIL |

## Ustalenia

### F1 — Wstrzyknięcie SQL w obsłudze autoryzacji

- **Ważność**: ❌ KRYTYCZNE
- **Wpływ**: 🔎 ŚREDNI — prawdziwy kompromis; zatrzymaj się, aby to przemyśleć
- **Wymiar**: Bezpieczeństwo i jakość
- **Lokalizacja**: src/auth/handler.ts:42
- **Szczegóły**: Zapytanie SQL zbudowane z konkatenacji ciągów. Plan określał zapytania parametryzowane.
- **Poprawka**: Zastąp literał szablonowy zapytaniem parametryzowanym używając db.query($1, [value]).
  - Siła: Pasuje do wzorca w src/users/query.ts; usuwa klasę wstrzyknięcia.
  - Kompromis: Drobny — jedno miejsce wywołania, zmiana kilku linii.
  - Pewność: WYSOKA — identyczny wzorzec używany gdzie indziej.
  - Martwy punkt: Brak znaczących.
- **Decyzja**: OCZEKUJĄCA

### F2 — Nieplanowany endpoint /api/status

- **Ważność**: ⚠️ OSTRZEŻENIE
- **Wpływ**: 🔬 WYSOKI — stawka architektoniczna; pomyśl dokładnie przed podjęciem decyzji
- **Wymiar**: Dyscyplina zakresu
- **Lokalizacja**: src/api/routes.ts:18
- **Szczegóły**: Nowy endpoint GET /api/status nie jest w planie.
- **Poprawka A ⭐ Zalecane**: Udokumentuj w planie jako dodatek
  - Siła: Zachowuje pracę; aktualizuje źródło prawdy.
  - Kompromis: Plan staje się nieco ruchomym celem.
  - Pewność: WYSOKA — wzorzec dodatków jest tu regularnie używany.
  - Martwy punkt: Zainteresowane strony pierwotnego zakresu nie są powiadamiane.
- **Poprawka B**: Usuń i dodaj do dalszych prac
  - Siła: Utrzymuje ścisłą dyscyplinę zakresu.
  - Kompromis: Traci zaimplementowaną pracę; później kolejny PR.
  - Pewność: ŚREDNIA — zależy od wywołań.
  - Martwy punkt: Nie sprawdzono wywołań.
- **Decyzja**: OCZEKUJĄCA

### F3 — camelCase vs. snake_case

- **Ważność**: ⚠️ OSTRZEŻENIE
- **Wpływ**: 🏃 NISKI — szybka decyzja; poprawka jest oczywista i wąsko zakrojona
- **Wymiar**: Spójność wzorców
- **Lokalizacja**: src/utils/format.ts
- **Szczegóły**: Używa camelCase, podczas gdy istniejące narzędzia używają snake_case.
- **Poprawka**: Zmień nazwy eksportów na snake_case, aby pasowały do src/utils/.
- **Decyzja**: OCZEKUJĄCA
```

Znacznik `<!-- IMPL-REVIEW-REPORT -->` i pola `Decision: PENDING` umożliwiają tryb wznowienia.

### Opcje kontynuacji

Po zapisaniu raportu i oznaczeniu `change.md`, zapytaj, jak postępować:

```
question: "Raport zapisany do <report-path>. Jak chcesz postępować?"
header: "Przegląd implementacji — [N] ustaleń"
options:
  - label: "Sortuj ustalenia teraz"
    description: "Przejdź przez każde ustalenie i zdecyduj. Decyzje są zapisywane z powrotem do zapisanego raportu."
  - label: "Sortuj później"
    description: "Wznów za pomocą /10x-impl-review <report-path>."
  - label: "Gotowe"
    description: "Raport zapisany — sam zajmę się ustaleniami."
multiSelect: false
```

- **Sortuj ustalenia teraz** → przejdź do Kroku 5; zapisany raport jest kopią roboczą.
- **Sortuj później** → wydrukuj ścieżkę zapisanego raportu i przypomnij, aby uruchomić `/10x-impl-review <report-path>`.
- **Gotowe** → wydrukuj ścieżkę zapisanego raportu i ZATRZYMAJ.

Niezależnie od wyboru, plik raportu i znacznik `impl_reviewed` już istnieją na dysku — wybór decyduje tylko o tym, czy sortowanie nastąpi teraz, później, czy zostanie pozostawione użytkownikowi.

## Krok 5: Interaktywne sortowanie

TaskUpdate: activeForm "Sortowanie"

### Tryb wznowienia

Jeśli wejście nastąpiło przez zapisany plik: przeczytaj go, przeanalizuj nagłówki `### F`, odfiltruj do `Decision: PENDING`. Jeśli brak: "Wszystkie ustalenia posortowane." Gotowe.

### Pętla sortowania

Przejdź przez ustalenia w kolejności ważności (CRITICAL → WARNING → OBSERVATION). Dla każdego:

**Z 2 opcjami naprawy:**

```
question: "F[N] — [tytuł]\n\nWażność: [ikona ważności] [WAŻNOŚĆ]\nWpływ: [ikona wpływu] [POZIOM] — [znaczenie]\nWymiar: [wymiar]\nLokalizacja: [lokalizacja]\n\nSzczegóły: [szczegóły]\n\n[Blok poprawki A]\n\n[Blok poprawki B]"
header: "Ustalenie [bieżące] z [całkowita pozostała liczba]"
options:
  - label: "Zastosuj poprawkę A ⭐"
    description: "[Jednowierszowa poprawka A]"
  - label: "Zastosuj poprawkę B"
    description: "[Jednowierszowa poprawka B]"
  - label: "Pomiń"
    description: "Nie warto teraz naprawiać."
  - label: "Zapisz jako lekcję"
    description: "Zapisz jako powtarzającą się regułę projektu za pomocą /10x-lesson."
multiSelect: false
```

**Z 1 opcją naprawy:**

```
question: "F[N] — [tytuł]\n\nWażność: [ikona ważności] [WAŻNOŚĆ]\nWpływ: [ikona wpływu] [POZIOM] — [znaczenie]\nWymiar: [wymiar]\nLokalizacja: [lokalizacja]\n\nSzczegóły: [szczegóły]\n\n[Blok poprawki]"
header: "Ustalenie [bieżące] z [całkowita pozostała liczba]"
options:
  - label: "Napraw teraz"
    description: "[Jednowierszowa poprawka]"
  - label: "Napraw inaczej"
    description: "Inne podejście — porozmawiajmy."
  - label: "Pomiń"
    description: "Nie warto teraz naprawiać."
  - label: "Zapisz jako lekcję"
    description: "Zapisz jako powtarzającą się regułę projektu za pomocą /10x-lesson."
multiSelect: false
```

**Obsługa odpowiedzi:**

- **Zastosuj poprawkę A/B / Napraw teraz**: pokaż dokładną zmianę kodu przed/po. Krótkie potwierdzenie ("Zastosować to?"), a następnie edytuj. Oznacz FIXED (zapisz, która opcja, np. "Fixed via Fix A").
- **Napraw inaczej**: zapytaj o preferowane podejście, zastosuj, oznacz FIXED.
- **Zapisz jako lekcję**: wstępnie wypełnij cztery pola wpisu lekcji bezpośrednio z ustalenia — `Context` z lokalizacji ustalenia, `Problem` ze szczegółów ustalenia, `Rule` i `Applies to` pozostaw jako puste miejsca do wypełnienia przez użytkownika. Pokaż proponowany wpis jako kompletny blok markdown i poproś użytkownika o edycję / potwierdzenie za pomocą AskUserQuestion ("Zatwierdzić ten wpis?" / "Edytuj przed zapisaniem" / "Anuluj"). Po potwierdzeniu, dołącz wpis jako nową sekcję H2 do `context/foundation/lessons.md` — jeśli plik nie istnieje, utwórz go najpierw z tym kanonicznym 5-liniowym nagłówkiem (brak oddzielnego pliku szablonu; nagłówek jest osadzony w tekście):

  ```
  # Wyciągnięte wnioski

  > Rejestr powtarzających się reguł i wzorców, tylko do dodawania. Ponownie odczytywany na początku przez /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

  ```

  Przepływ wstępnego wypełniania, a następnie potwierdzania jest kluczowym elementem UX; użytkownik musi zobaczyć cały proponowany wpis z wstępnie wypełnionym Context/Problem i mieć możliwość edycji Rule i Applies-to przed dodaniem. Po pomyślnym dodaniu, **zawsze** zadaj pytanie uzupełniające za pomocą AskUserQuestion: "Lekcja zapisana. Czy zastosować również poprawkę do bieżącego kodu?" z opcjami "Tak — napraw teraz" / "Nie — tylko lekcja". **Nigdy nie pomijaj tego pytania ani nie decyduj w imieniu użytkownika** — niezależnie od tego, czy poprawka jest trywialna, poza zakresem, czy obejmuje wiele plików, decyzja należy do użytkownika. Jeśli tak: pokaż zmianę kodu przed/po, zastosuj, oznacz `FIXED + ACCEPTED-AS-RULE: <tytuł reguły>`. Jeśli nie: oznacz `ACCEPTED-AS-RULE: <tytuł reguły>` (ustalenie pozostaje nienaprawione, reguła jest zapisana do przyszłej pracy).

- **Pomiń** → SKIPPED. Idź dalej, nie kłóć się.
- **Inne (dowolny tekst)**: zinterpretuj intencję użytkownika. Typowe intencje: "napraw inaczej" (zwłaszcza w kontekście podwójnej poprawki) → zapytaj o preferowane podejście, zastosuj, oznacz FIXED; "zaakceptuj ryzyko" → oznacz ACCEPTED z uzasadnieniem użytkownika; "odrzuć"/"nie zgadzam się" → oznacz DISMISSED.

Po każdej decyzji, zaktualizuj pole `Decision:` w zapisanym raporcie dla tego ustalenia (raport zawsze istnieje na dysku — patrz Krok 4).

### Podsumowanie

```
═══════════════════════════════════════════════════════════
  SORTOWANIE ZAKOŃCZONE
═══════════════════════════════════════════════════════════

  Naprawiono:     F1, F2 (Poprawka A)   (2)
  Reguła:      F3 (+ naprawiono)     (1)
  Pominięto:   F4               (1)
  Zaakceptowano:  F5               (1)

═══════════════════════════════════════════════════════════
```

Zaktualizuj zapisany raport o ostateczne decyzje. Oznacz zadanie przeglądu jako ukończone.

## Uwagi

- To jest umiejętność **przeglądu**. Domyślnie analizuj i raportuj — dokonuj edycji tylko podczas sortowania, gdy użytkownik wyraźnie wybierze "Zastosuj poprawkę" lub "Napraw inaczej" dla konkretnego ustalenia.
- Bądź konkretny. "src/auth/handler.ts:42 — Zapytanie SQL zbudowane z konkatenacji ciągów, podatne na wstrzyknięcie" — a nie "może być gdzieś problem z bezpieczeństwem".
- Nie oznaczaj preferencji stylistycznych, chyba że mają znaczenie. Jeśli kod działa i jest zgodny z planem, drobne różnice stylistyczne od istniejącego kodu są obserwacjami, a nie ostrzeżeniami.
- Jeśli sam plan był wadliwy (np. zaplanowano niebezpieczne podejście), oznacz to — ten przegląd wychwytuje również problemy z planem.
- Wpływ dotyczy **wysiłku decyzyjnego**, a nie **ważności**. NISKI wpływ na ustalenie CRITICAL oznacza, że poprawka jest oczywista; WYSOKI wpływ na WARNING oznacza, że kompromis jest realny.
- Dwie opcje naprawy tylko wtedy, gdy istnieje prawdziwy kompromis. Nie wymyślaj alternatyw dla trywialnych poprawek.
- Podczas przeglądania pojedynczej fazy, nadal sprawdzaj, czy zmiany z tej fazy nie naruszyły założeń poprzednich faz. Fazy mogą wchodzić w interakcje.
- Podczas sortowania, utrzymuj tempo. Użytkownik już przeczytał raport.
- Podczas naprawiania, minimalne, ukierunkowane edycje. Nie refaktoryzuj otaczającego kodu ani nie "ulepszaj" rzeczy, które nie zostały oznaczone.
