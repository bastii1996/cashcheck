---
name: 10x-e2e
description: Drive an approved plan's browser-level (E2E) phases against the running app, one risk at a time — plan → generate → review → verify. The E2E sibling of /10x-implement and /10x-tdd, sharing the same plan and Progress. Only drives risks that genuinely need a browser and whose feature is already built; redirects the rest to /10x-tdd or /10x-implement. Use when the user says "e2e", "write/generate a Playwright test", "browser test this risk", or "drive the plan's E2E phases".
allowed-tools:
  - Read
  - Glob
  - Grep
  - Write
  - Edit
  - Bash
  - Task
  - AskUserQuestion
  - TaskCreate
  - TaskUpdate
  - TaskList
  - TaskGet
  - mcp__playwright__browser_navigate
  - mcp__playwright__browser_snapshot
  - mcp__playwright__browser_click
  - mcp__playwright__browser_type
  - mcp__playwright__browser_fill_form
  - mcp__playwright__browser_wait_for
  - mcp__playwright__browser_evaluate
  - mcp__playwright__browser_take_screenshot
argument-hint: "<change-id> [phase N] | @context/changes/<change-id>/plan.md | <risk-id>"
---

# 10x E2E — Wykonywanie planu E2E opartego na ryzyku

Realizujesz zatwierdzony plan techniczny z `context/changes/<change-id>/plan.md` w celu uzyskania **pokrycia na poziomie przeglądarki**, jedna faza na raz, jedno ryzyko na raz. Agent może wygenerować _przechodzący_ test E2E w kilka sekund; trudna część polega na tym, aby **chronił on rzeczywiste ryzyko** i **przetrwał refaktoryzację jutra**. Ta umiejętność dotyczy tylko tych faz, w których taka praca jest potrzebna — ryzyka, które przekracza kilka granic systemowych (uwierzytelnianie, routing, API, DB) lub istnieje tylko w renderowanym interfejsie użytkownika — i dla każdego z nich uruchamia pętlę:

```
PLANUJ → wybierz ryzyko, eksploruj działającą aplikację, mapuj przepływ (lub wypełnij szablon promptu)
GENERUJ → przekształć przepływ w test z egzemplarza początkowego + reguły E2E
PRZEGLĄDAJ → sprawdź go pod kątem pięciu antywzorców E2E agenta; ponownie wywołaj prompt po nazwie
WERYFIKUJ → uruchom go na zielono, a następnie potwierdź, że zawodzi, gdy ryzyko faktycznie się materializuje
```

Ta umiejętność jest **E2E odpowiednikiem `/10x-implement` i `/10x-tdd`**. Odczytuje ten sam plan, modyfikuje tę samą kanoniczną sekcję `## Progress` i używa tego samego rytuału zatwierdzania na koniec fazy oraz przekazywania schowka. Różnica polega na wewnętrznej pętli: zamiast pisać kod produkcyjny (`/10x-implement`) lub najpierw nieudany test jednostkowy (`/10x-tdd`), generujesz i wzmacniasz test na poziomie przeglądarki dla **działającej aplikacji**. Ponieważ te trzy umiejętności współdzielą `## Progress`, możesz je swobodnie przeplatać — zbuduj funkcję za pomocą `/10x-implement`, przetestuj jednostkowo następną fazę za pomocą `/10x-tdd`, a następnie wróć tutaj, aby dodać warstwę E2E dla ryzyka międzygranicznego, a stan nigdy nie zostanie utracony.

Oprócz tej ścieżki opartej na planie, `/10x-e2e` działa również **autonomicznie** dla pojedynczego ryzyka: `/10x-e2e <risk-id>` (lub bez argumentu) odczytuje `context/foundation/test-plan.md`, wybiera najwyższe ryzyko na poziomie przeglądarki i generuje **jeden** przejrzany, zweryfikowany test, a następnie zatrzymuje się — bez folderu zmian, bez `## Progress`, bez rytuału zatwierdzania. Użyj go do szybkiego jednorazowego działania poza śledzoną zmianą. Wszystko poniżej dotyczące **Konfiguracji**, **Zakończenia fazy** i **Śledzenia stanu** dotyczy tylko ścieżki opartej na planie; autonomiczne uruchomienie przechodzi bezpośrednio do bramki, raz wykonuje pętlę PLAN→GENERUJ→PRZEGLĄDAJ→WERYFIKUJ i zgłasza test.

Podstawowa zasada: **nie generuj testów E2E od zera.** Zacznij od ryzyka, które nazwa fazy, i kontroluj wynik agenta za pomocą dwóch dźwigni jakości — **testu początkowego** i **reguł E2E**. Prompt dostarcza tylko to, czego te dwie nie mogą zakodować: konkretne ryzyko, przepływ i granice rzeczywiste kontra zamockowane.

```
context/foundation/test-plan.md (ryzyka, do których odwołują się fazy planu)
        │
        ▼
   seed.spec.ts  +  reguły E2E  →  kształtują każdy wygenerowany test
        │                          (getByRole, izolacja, wait-for-state, rzeczywiste vs zamockowane)
        ▼
   PLAN → GENERUJ → PRZEGLĄDAJ → WERYFIKUJ  →  jeden przejrzany test na ryzyko  →  CI
```

Agenci widzą **drzewo dostępności** (role, nazwy, stany w migawce YAML z odniesieniami do elementów), a nie piksele — więc naturalnie tworzą testy oparte na `getByRole`, a nie selektory CSS.

Ścieżka planu: `$ARGUMENTS`

## Co zakłada ta umiejętność — i czego nie zrobi

- **Playwright jest zainstalowany, a aplikacja jest uruchamialna.** Zakłada się, że istnieje konfiguracja Playwright, sposób uruchomienia **pojedynczego** speca, wzorzec uwierzytelniania (`storageState`) i sposób uruchomienia aplikacji (serwer deweloperski lub konfiguracja `webServer`). Ta umiejętność je **odkrywa**; **nie** instaluje Playwright, nie tworzy konfiguracji ani nie łączy z CI. Jeśli Playwright jest całkowicie nieobecny, zatrzymaj się i poinformuj użytkownika, aby najpierw go skonfigurował.
- **Funkcja poddawana testom już istnieje.** E2E działa na prawdziwej, działającej aplikacji — więc w przeciwieństwie do `/10x-tdd`, implementacja musi być **obecna**, a nie nieobecna. Jeśli funkcja fazy nie jest jeszcze zbudowana, przeglądarka nie ma nic do uruchomienia; zatrzymaj się i przekieruj do `/10x-implement` (lub `/10x-tdd`), aby najpierw ją zbudować, a następnie wróć.
- **Tworzy dwie dźwignie jakości, ale nic więcej.** Przy pierwszym użyciu tworzy `seed.spec.ts` i plik reguł E2E z `references/`, jeśli ich brakuje — jest to jednorazowa konfiguracja na projekt, której potrzebują dźwignie. **Nie** konfiguruje reszty infrastruktury testowej.
- **Uruchamia jeden przejrzany test na ryzyko, a nie całą serię.** W przeciwieństwie do "generowania testów dla każdej strony", ta umiejętność pisze mały, związany z ryzykiem zestaw i wzmacnia każdy z nich poprzez przegląd i celowe sprawdzenie błędu. E2E to najdroższa, najbardziej podatna na błędy warstwa — liczba pokrycia nigdy nie jest celem; chronione ryzyko jest.
- **Każda faza jest sprawdzana pod kątem tego, czy E2E faktycznie pasuje i czy aplikacja jest gotowa.** Niektóre fazy (czysta logika, konfiguracja, szkielet) nigdy nie powinny mieć testu E2E. Funkcje, które nie są zbudowane, nie mogą być uruchamiane w przeglądarce. Te przypadki są przekierowywane lub zatrzymywane, jak opisano poniżej.

## Przegląd faz

```
KONFIGURACJA     → Rozwiąż plan, przeczytaj w całości, potwierdź, że Playwright + aplikacja są uruchamialne, upewnij się, że istnieją seed + reguły, utwórz zadania dla każdej fazy
Dla każdej fazy:
  ├─ BRAMKA       → Czy to ryzyko jest na poziomie przeglądarki, ORAZ czy funkcja jest zbudowana, ORAZ czy test E2E jest nieobecny? Jeśli nie → przekieruj lub zatrzymaj
  ├─ PLANUJ/GENERUJ/PRZEGLĄDAJ/WERYFIKUJ → Pętla dla każdego ryzyka w fazie, aż do spełnienia kryteriów sukcesu
  └─ KONIEC FAZY  → Odpowiedni E2E na zielono → ręczna bramka → rytuał zatwierdzania → decyzja o następnej fazie (schowek)
Po wszystkich fazach → Podsumowanie ukończenia + opcjonalny /10x-impl-review
```

Każda faza kończy się punktem kontrolnym użytkownika. Nigdy nie pomijaj fazy po cichu ani nie łącz dwóch faz w jedno zatwierdzenie.

---

## Konfiguracja

> Uruchomienia autonomiczne (sterowane ryzykiem) pomijają całą tę sekcję — przechodzą bezpośrednio do bramki.

Gdy ta umiejętność jest wywoływana:

1. **Rozwiąż plan**:
   - `/10x-e2e <change-id> [phase N]` → `context/changes/<change-id>/plan.md`.
   - `@context/changes/<change-id>/plan.md` lub pełna ścieżka → zaakceptuj bez zmian.
   - **Odmów, jeśli rozwiązana ścieżka zaczyna się od `context/archive/`** — wydrukuj "Ta zmiana jest zarchiwizowana. Zamiast tego otwórz nową zmianę za pomocą `/10x-new`." i ZATRZYMAJ.
   - Jeśli nic nie zostało podane, wydrukuj poniższą wiadomość i **ZATRZYMAJ i czekaj**:

```
Będę realizować zatwierdzony plan faz na poziomie przeglądarki (E2E) — planuj → generuj → przeglądaj → weryfikuj, jedno ryzyko na raz. Proszę podać:

1. Identyfikator zmiany (np. `/10x-e2e save-session phase 6`), lub
2. Pełną ścieżkę (np. `@context/changes/save-session/plan.md`).

Możesz wyświetlić aktywne zmiany za pomocą: `ls context/changes/`

Wskazówka: plan powinien być już przejrzany i zatwierdzony — ta umiejętność wykonuje jego fazy E2E, nie pisze planu.
```

2. **Przeczytaj plan w całości** — każdą fazę, każdy blok `Changes Required`, każdy element `Success Criteria`. Nigdy nie używaj limitu/offsetu; potrzebujesz pełnego kontekstu. Sekcja `## Progress` na dole jest **autorytatywna dla stanu wykonania** — znaczniki wyboru (`- [x]`) znajdują się TYLKO tam. Bloki faz zawierają zwykłe punktorzy `- `, bez pól wyboru. Zauważ, które fazy odwołują się do ryzyka z `context/foundation/test-plan.md`, które wymaga pokrycia na poziomie przeglądarki; to właśnie te fazy są obsługiwane przez tę umiejętność.

3. **Przeczytaj `context/foundation/test-plan.md`** jeśli istnieje — zawiera mapę ryzyka, którą chroni każda faza E2E (wpływ, prawdopodobieństwo, zachowanie, które potwierdziłoby ochronę). Ryzyko, a nie plik, jest tutaj jednostką pracy.

4. **Przeczytaj `context/foundation/lessons.md`** jeśli istnieje i przyswój każdy wpis przed rozpoczęciem jakiejkolwiek fazy — są to zaakceptowane powtarzające się zasady zespołu i muszą kształtować każdy wybór testowy w tym uruchomieniu.

5. **Potwierdź, że infrastruktura Playwright istnieje i aplikacja jest uruchamialna (lekkie sprawdzenie — nie badaj całego świata):**
   - Znajdź konfigurację Playwright (`playwright.config.*`), naucz się polecenia do uruchomienia **pojedynczego** speca, konfiguracji uwierzytelniania (`storageState` / projekt `setup`) i sposobu uruchamiania aplikacji (blok `webServer` lub polecenie serwera deweloperskiego). Wystarczy pojedynczy `Glob` dla `*.spec.ts` / `playwright.config.*` plus przeczytanie jednego przykładu i konfiguracji.
   - **Jeśli nie ma konfiguracji Playwright i żadnych plików `*.spec.ts`**, ZATRZYMAJ:

```
Fazy E2E tego planu wymagają Playwrighta, zanim będę mógł je uruchomić — nie znalazłem żadnego
(brak playwright.config.*, brak plików *.spec.ts).

Ta umiejętność zakłada, że Playwright jest już zainstalowany; nie będzie go konfigurować. Opcje:
  • Najpierw zainstaluj i skonfiguruj Playwright (npm init playwright@latest), a następnie ponownie uruchom /10x-e2e.
  • Użyj /10x-tdd lub /10x-implement dla pokrycia poza przeglądarką.
```

6. **Upewnij się, że istnieją dwie dźwignie jakości (jednorazowa konfiguracja na projekt).** To one wykonują ciężką pracę — prompt pozostaje krótki.
   - **Test początkowy** (`seed.spec.ts`): egzemplarz, na którym wzorowany jest każdy wygenerowany test. _Co pokażesz, to dostaniesz_ — jeśli seed używa `getByRole`, wygenerowane testy również; jeśli ma `waitForTimeout`, każdy wygenerowany test to dziedziczy. Jeśli brakuje, utwórz go z `references/seed-test-pattern.md`, dostosowanego do rzeczywistych tras i ról tej aplikacji. Zobacz także `references/browser-driven-generation.md`.
   - **Reguły E2E**: plik reguł, który agent automatycznie odczytuje przed generowaniem kodu (`CLAUDE.md`, `.cursor/rules/` lub dedykowany plik w katalogu testowym). Jeśli brakuje, utwórz go z `references/e2e-quality-rules.md`.
   - Traktuj oba jako część zestawu plików dotkniętych **pierwszej fazy**, aby znalazły się w zatwierdzeniu tej fazy. Gdy już istnieją, pozostaw je — nie twórz ich ponownie w każdej fazie.

7. **Zaktualizuj `change.md`**: ustaw `status: implementing` (tylko jeśli aktualnie w `{planned, plan_reviewed}`) i `updated: <today>`.

8. **Utwórz jedno zadanie na fazę** (pojawiają się one na pasku stanu użytkownika): dla każdego nagłówka `## Phase N:`, który zamierzasz uruchomić, `TaskCreate` z `subject: "Phase N: [Nazwa Fazy]"` i `activeForm: "E2E Phase N"`. Oznacz bieżącą fazę jako `in_progress` przed rozpoczęciem; oznacz ją jako `completed`, gdy jej kryteria sukcesu zostaną spełnione.

9. **Znajdź punkt początkowy**: przeskanuj `## Progress` — pierwsza linia `- [ ]` w kolejności dokumentu to miejsce, od którego zaczynasz. Jeśli podano argument `phase N`, przejdź do pierwszej linii `- [ ]` pod `### Phase N:`.

> **Konwencja schowka.** Wszędzie tam, gdzie ta umiejętność mówi _skopiuj `X` do schowka_, przekaż dokładny ciąg `X` do schowka platformy — spróbuj `pbcopy` (macOS), następnie `clip.exe` (Windows/WSL), następnie `xclip -selection clipboard` (Linux), i cicho wróć, jeśli żadne nie istnieją. Następnie wyświetl skopiowane polecenie w osobnej linii z sufiksem `(✓ skopiowano)`.

---

## Bramka kwalifikowalności E2E — uruchamiana przed każdą fazą (sterowana planem) / raz (autonomicznie)

Zanim zaplanujesz pojedynczy test dla fazy, zdecyduj o trzech rzeczach w tej kolejności:

1. **Dopasowanie na poziomie przeglądarki** — ryzyko fazy rzeczywiście wymaga kompleksowego pokrycia.
2. **Obecność funkcji** — testowana funkcja jest już zbudowana, a aplikacja jest uruchamialna.
3. **Brak testu** — przechodzący test E2E dla tego ryzyka jeszcze nie istnieje.

Faza kwalifikuje się do tej umiejętności tylko wtedy, gdy wszystkie trzy warunki są spełnione.

### Sprawdzenie dopasowania na poziomie przeglądarki

Ryzyko wymaga E2E, gdy **przekracza kilka granic systemowych** (uwierzytelnianie, routing, API, DB) lub **istnieje tylko w renderowanym interfejsie użytkownika**. Jeśli izolowana funkcja, kontrakt punktu końcowego lub test integracyjny mógłby udowodnić ryzyko, E2E jest niewłaściwym (wolnym, kruchym) narzędziem — zamiast tego użyj `/10x-tdd` lub `/10x-implement`.

| Wartościowe dla E2E — uruchom tutaj                                              | Niewartościowe dla E2E — przekieruj do /10x-tdd lub /10x-implement                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Pełne przepływy użytkownika przez uwierzytelnianie → routing → API → DB          | Czyste funkcje, parsery, walidatory, obliczanie flag                                 |
| Dane przetrwają rzeczywiste przeładowanie strony SSR / nawigację                 | Kontrakt statusu/kształtu/uwierzytelniania/bramkowania pojedynczego punktu końcowego |
| Stan, który istnieje tylko w renderowanym, interaktywnym interfejsie użytkownika | Logika biznesowa z jasnymi wejściami/wyjściami                                       |
| Wielostopniowe podróże, których test jednostkowy nie może odtworzyć              | Wszystko, co może udowodnić izolowana funkcja lub test integracyjny                  |
| Ryzyka, które pojawiają się tylko wtedy, gdy integrują się rzeczywiste granice   | Konfiguracja, szkielet, okablowanie infrastruktury, dokumentacja                     |

### Sprawdzenie obecności funkcji (odwrotność /10x-tdd)

E2E uruchamia **działającą aplikację**, więc funkcja musi już istnieć. Sprawdź `Changes Required` fazy i przeprowadź ukierunkowane wyszukiwanie tras, stron, komponentów i punktów końcowych, których dotyczy przepływ, i potwierdź, że aplikacja faktycznie się uruchamia.

Jeśli testowana funkcja **nie jest jeszcze zbudowana**, ZATRZYMAJ — przeglądarka nie ma nic do uruchomienia. Wydrukuj ten blok, uzupełniając konkretne dowody:

```
Ryzyko E2E fazy [N] wymaga działającej funkcji, ale funkcja nie jest jeszcze zbudowana.

E2E działa na prawdziwej aplikacji; implementacja musi istnieć, zanim przeglądarka będzie mogła ją uruchomić. Tutaj stwierdziłem jej brak:
- [dowody trasy/strony/komponentu/punktu końcowego]

Najpierw ją zbuduj, a następnie wróć po warstwę E2E:
→ /10x-implement <change-id> phase [N]
```

Skopiuj `/10x-implement <change-id> phase [N]` do schowka, wyświetl go z `(✓ skopiowano)` i ZATRZYMAJ.

### Sprawdzenie braku testu

Szybko poszukaj istniejącego speca obejmującego to ryzyko. Jeśli **przechodzący** test E2E dla ryzyka już istnieje, nie generuj go ponownie — zaznacz wiersz Postępu i przejdź dalej (lub, jeśli jest mieszany, zapytaj). Jeśli test istnieje, ale **zawodzi**, to jest to zadanie debugowania, a nie generowania — skieruj użytkownika do przepływu pracy debugowania od nieudającego się testu do przyczyny, zamiast pozwalać narzędziu do automatycznej naprawy cicho przepisywać asercję. (Zobacz granicę automatycznej naprawy w wytycznych E2E.)

### Jak zastosować bramkę

- Jeśli wszystkie trzy warunki są spełnione, stwierdź to w jednej linii i przejdź do pętli planuj → generuj → przeglądaj → weryfikuj.
- Jeśli ryzyko **wyraźnie nie jest na poziomie przeglądarki**, uruchom **przekierowanie** (poniżej).
- Jeśli jest **mieszane lub niejednoznaczne** (np. faza, która jest częściowo kontraktem punktu końcowego, częściowo przepływem renderowanego interfejsu użytkownika), użyj `AskUserQuestion`:
  - question: "Faza [N] łączy ryzyko funkcji izolowanej i przepływ na poziomie przeglądarki. Jak powinienem to obsłużyć?"
    header: "Bramka E2E"
    options:
    - label: "E2E część na poziomie przeglądarki (Zalecane)"
      description: "Zaplanuję→wygeneruję→przejrzę→zweryfikuję przepływ międzygraniczny i przekieruję część funkcji izolowanej do /10x-tdd."
    - label: "Przekieruj całą fazę do /10x-tdd"
      description: "Przekaż całą fazę — skopiuj polecenie wznowienia do schowka."
    - label: "E2E całą fazę mimo wszystko"
      description: "Wymuś pokrycie na poziomie przeglądarki nawet dla części, które test jednostkowy by udowodnił. Wolniej, bardziej krucho."
      multiSelect: false

### Przekieruj fazę nie-E2E

Podaj _dlaczego_ faza nie pasuje do poziomu przeglądarki (jedno lub dwa zdania, oparte na powyższej tabeli), a następnie użyj `AskUserQuestion`:

- question: "Faza [N] nie jest dobrym dopasowaniem E2E. Jak chcesz to obsłużyć?"
  header: "Niewartościowe dla E2E"
  options:
  - label: "Przekaż do /10x-tdd (Zalecane)"
    description: "Skopiuj `/10x-tdd <change-id> phase N` do schowka. Wyczyść kontekst, uruchom, a następnie wznow E2E w następnej fazie."
  - label: "Przekaż do /10x-implement"
    description: "Skopiuj `/10x-implement <change-id> phase N` do schowka, jeśli test-first również nie pasuje."
  - label: "E2E w tym miejscu mimo wszystko"
    description: "Wygeneruję test na poziomie przeglądarki pomimo kosztów — a następnie przejdę do bramki następnej fazy."
  - label: "Pomiń — już zrobione"
    description: "Zaznacz wiersze Postępu fazy i przejdź do następnej fazy."
    multiSelect: false

**W przypadku "Przekaż":** skopiuj wybrane polecenie wznowienia do schowka, wydrukuj poniższy blok i ZATRZYMAJ — inna umiejętność odwróci wiersze Postępu tej fazy i uruchomi własny rytuał zatwierdzania. Poinformuj użytkownika, aby wznowił E2E później.

```
Faza [N] nie jest materiałem na poziomie przeglądarki — [jednolinijkowy powód].

→ /10x-tdd <change-id> phase [N] (✓ skopiowano)

Wyczyść kontekst (`/clear`), uruchom to, a następnie wróć z:
→ /10x-e2e <change-id> phase [N+1]
```

**W przypadku "Pomiń":** odwróć wiersze Postępu fazy `[ ]` → `[x]` (bez SHA, ponieważ nic nie zostało zatwierdzone) i przejdź do następnej fazy.

---

## Cykl Planuj → Generuj → Przeglądaj → Weryfikuj

W ramach kwalifikującej się fazy pracuj ryzyko po ryzyku. Każdy krok `#### Automated` w Postępie fazy (lub każde odrębne ryzyko na poziomie przeglądarki w jego `Changes Required`) to jedno przejście przez pętlę. Utrzymuj pętlę ciasną — jedno ryzyko, jeden przejrzany test, zweryfikowany przed przejściem dalej.

### Budżet testowy na fazę

E2E jest drogie i podatne na błędy, więc budżet jest **ciasny** — zazwyczaj **jeden test na ryzyko**, i rzadko więcej niż **1-3 na fazę**. Wybierz przepływ, który udowadnia ryzyko i wychwyciłby rzeczywistą regresję. Chronisz nazwane ryzyko, a nie gonisz za pokryciem. Nie generuj testu na stronę ani na przycisk.

### PLANUJ — wybierz ryzyko i mapuj przepływ

1. Sformułuj kontrakt w jednym zdaniu: **wejście** = jedno ryzyko na poziomie przeglądarki; **wyjście** = przejrzany test E2E, który _zawodzi, gdy to ryzyko się materializuje_. Jeśli ryzyko fazy nie jest konkretne, wyciągnij obserwowalny wynik biznesowy z `test-plan.md` lub kryteriów sukcesu fazy przed planowaniem. W autonomicznym uruchomieniu bez `test-plan.md`, najpierw zapytaj użytkownika o ryzyko i jego obserwowalny wynik biznesowy.
2. Wybierz ścieżkę — ten sam kontrakt w obu przypadkach:
   - **Sterowana przeglądarką** (domyślnie, gdy możesz uruchomić prawdziwą przeglądarkę — preferuj **CLI** Playwrighta ze względu na niższy koszt tokenów, w przeciwnym razie serwer **MCP** Playwrighta): działasz zarówno jako planista, jak i generator. Nawiguj po działającej aplikacji, eksploruj jej **migawkę dostępności** (nie zrzuty ekranu) i mapuj przepływ dla tego ryzyka — ścieżkę sukcesu plus przypadek brzegowy/błędu, który implikuje ryzyko. Modeluj plan na `seed.spec.ts` — **jakość seeda to jakość testu.** Zobacz `references/browser-driven-generation.md` dla kompromisu transportowego (CLI vs MCP) i pełnej dyscypliny (najpierw skonfiguruj stronę, migawka zamiast zrzutów ekranu, scenariusze niezależne i w dowolnej kolejności).
   - **Szablon promptu** (bez aktywnej przeglądarki, najprostszy): wypełnij `references/e2e-prompt-template.md` ryzykiem, kotwicą badawczą, scenariuszem biznesowym i granicami rzeczywistymi kontra zamockowanymi, i napisz specyfikację na podstawie swojego odczytu aplikacji. Pozostaw plik szablonu nietknięty; napisz _nowy_ plik promptu dla tego konkretnego ryzyka. Użyj tego, gdy nie ma dostępnego Playwright MCP lub przepływ jest prosty i dobrze zrozumiały.
3. Oddziel **rzeczywiste** od **zamockowanych** granic z góry. **E2E ≠ zero mockowania.** Wewnętrzne granice (uwierzytelnianie, routing, DB) pozostają rzeczywiste — tam ukrywa się ryzyko integracji. Mockuj drogie lub niedeterministyczne zewnętrzne API na warstwie sieciowej. (Uwaga: dla API, które aplikacja wywołuje **po stronie serwera**, `page.route()` na poziomie przeglądarki go nie przechwyci — mockuj je tam, gdzie serwer faktycznie wywołuje.)

### GENERUJ — utwórz test z dźwigni

4. Wygeneruj test zgodnie z konwencjami, które seed i reguły już kodują — nie powtarzaj ich w prompcie. Na ścieżce sterowanej przeglądarką, **wykonaj każdy krok na żywo** i napisz specyfikację na podstawie tego, co faktycznie ujawniło uruchomienie (odporne lokatory, rzeczywiste oczekiwania), a nie na podstawie domysłów. W zasadzie wynik musi używać **lokatorów opartych na rolach**, być **niezależnie uruchamialny** (własna konfiguracja/akcja/asercja/czyszczenie), **czekać na stan**, a nie na czas, **uwierzytelniać bez interfejsu użytkownika**, używać **unikalnych danych testowych** i mieć nazwę, która **wiąże go z ryzykiem** (nie `test('test 1', ...)`). Plik reguł (`references/e2e-quality-rules.md`) zawiera składnię dla każdego narzędzia.
5. **Jeden test na plik**, umieszczony zgodnie z konwencją projektu (domyślnie: katalog e2e na poziomie projektu, np. `tests/e2e/<feature>.spec.ts`). Nazwa pliku to przyjazna dla systemu plików nazwa scenariusza; `describe` odpowiada elementowi planu/ryzyka najwyższego poziomu; umieść tekst każdego kroku planu jako komentarz przed akcjami, które go implementują, i zachowaj nagłówek pochodzenia łączący specyfikację z jej ryzykiem i seedem.

### PRZEGLĄDAJ — pięć antywzorców, ponownie wywołaj prompt po nazwie

6. Nigdy nie ufaj wygenerowanemu testowi E2E na pierwszy rzut oka. Przejrzyj go pod kątem pięciu antywzorców E2E agenta w `references/e2e-anti-patterns.md`: halucynowana asercja, kruchy selektor, współdzielony stan, oczekiwanie na czas, brak czyszczenia.
7. Dla każdego znalezionego antywzorca, **ponownie wywołaj prompt po nazwie** — nigdy "napraw ten test". Nazwij konkretny antywzorzec, wyjaśnij _dlaczego_ nie chroni on ryzyka (lub dlaczego generuje fałszywe błędy) i podaj **wzorzec docelowy**. Trzy elementy na ponowne wywołanie promptu: co jest nie tak, dlaczego nie chroni ryzyka, co go zastępuje. Zobacz dyscyplinę ponownego wywoływania promptu w `references/e2e-anti-patterns.md`.

### WERYFIKUJ — zielony, a następnie związany z ryzykiem

8. **Uruchom tylko ten spec** z wywołaniem pojedynczego speca projektu (na działającej aplikacji) i potwierdź, że przechodzi. Krótko pokaż użytkownikowi zielony wynik.
9. **Pytanie kontrolne:** _czy ten test zawiódłby, gdyby ryzyko z `test-plan.md` się zmaterializowało?_ Jeśli nie, asercja jest dekoracyjna — wróć do GENERUJ/PRZEGLĄDAJ. Aby to uściślić, wykonaj **celowe uszkodzenie**: tymczasowo odwróć lub osłab zachowanie produkcyjne, które ryzyko dotyczy (lub cel kluczowej asercji testu), uruchom ponownie i potwierdź, że test staje się czerwony. Jeśli pozostaje zielony po uszkodzeniu rzeczy, którą ma chronić, asercja niczego nie chroni — napraw to przed przejściem dalej. **Natychmiast cofnij celowe uszkodzenie**; nigdy go nie zatwierdzaj.
10. **Oznacz krok jako wykonany.** Odwróć dokładnie ten wiersz w `## Progress`: `- [ ] N.M <tytuł>` → `- [x] N.M <tytuł>` (bez SHA jeszcze — SHA ląduje na końcu fazy). Następnie wróć do PLANUJ dla następnego ryzyka.

Nigdy nie używaj `test.skip()` / `test.fixme()` do "przejścia" fazy — pominięty test jest niewidoczny. Test, którego nie można zmusić do przejścia na prawdziwej aplikacji, jest sygnałem do zbadania (funkcji, przepływu lub błędu), a nie do uciszenia.

Powtarzaj PLANUJ→GENERUJ→PRZEGLĄDAJ→WERYFIKUJ, aż każdy krok `#### Automated` w fazie będzie `[x]`, a kryteria sukcesu fazy zostaną spełnione.

W uruchomieniu **autonomicznym** nie ma fazy i nie ma `## Progress`: po tym, jak WERYFIKUJ potwierdzi zielony wynik plus celowe uszkodzenie, **zatrzymaj się** — zgłoś plik specyfikacji i ryzyko, które chroni, i pomiń rytuał zakończenia fazy poniżej.

---

## Zakończenie fazy (tylko sterowane planem)

Gdy wszystkie wiersze `#### Automated` w `### Phase N:` są `[x]`, uruchom rytuał zakończenia fazy (odzwierciedla to `/10x-implement` i `/10x-tdd` — jedno zatwierdzenie Conventional-Commits na fazę, a następnie zapisz jego krótki SHA z powrotem do wierszy, które się zmieniły).

> **Twardy niezmiennik — zatwierdzaj tylko na zielono.** Nigdy nie proponuj, nie przygotowuj ani nie twórz zatwierdzenia, gdy jakikolwiek test w zakresie jest czerwony, pominięty w celu udawania przejścia, lub gdy celowe uszkodzenie jest nadal w drzewie. Zatwierdzenie jest oferowane **tylko po tym, jak nowe testy E2E przejdą na działającej aplikacji** i wszelkie celowe edycje uszkodzeń zostaną cofnięte. Czerwień celowego uszkodzenia to przejściowy punkt kontrolny, który pokazujesz użytkownikowi, nigdy granica zatwierdzenia.

Utrzymuj **zestaw dotkniętych plików** przez całą fazę: każdy plik, który `Edytujesz`/`Piszesz` (specyfikacje, plik promptu, a w pierwszej fazie dźwignie seed + reguły) trafia do niego, plus `context/changes/<change-id>/plan.md` (zawsze — edytujesz jego Postęp). W **pierwszej fazie** zmiany, również zasil go wszelkimi nieśledzonymi/zmodyfikowanymi plikami w `context/changes/<change-id>/` (`change.md`, `research.md` itp.). Zestaw **resetuje się na każdej granicy fazy**.

1. **Uruchom specyfikację(e) E2E fazy** na działającej aplikacji i potwierdź zielony wynik. (Pełne przejście E2E działa w CI, a nie na każdą edycję — lokalnie potwierdzasz specyfikację(e) dodane w tej fazie. Napraw wszelkie błędy przed zatwierdzeniem.)

2. **Bramka ręcznego potwierdzenia.** Poinformuj człowieka, że automatyczna weryfikacja przeszła, wymień elementy ręcznej weryfikacji planu dla tej fazy (w tym sprawdzenie celowego uszkodzenia, które uruchomiłeś) i wstrzymaj. Nie kontynuuj, dopóki nie potwierdzą.

```
Faza [N] Ukończona (E2E) — Gotowa do ręcznej weryfikacji

Automatyczna weryfikacja przeszła:
- [Specyfikacje E2E są teraz zielone: wymień je]
- [Sprawdzenie celowego uszkodzenia: jakie zachowanie odwróciłeś i potwierdziłeś, że test je wychwycił]

Proszę wykonać kroki ręcznej weryfikacji z planu:
- [elementy ręczne dla tej fazy]

Daj mi znać, kiedy ręczne testowanie zostanie zakończone, abym mógł zatwierdzić.
```

W **ostatniej fazie** również zsumuj wszelkie nadal oczekujące wiersze `#### Manual` z wcześniejszych faz (informacyjne; bramka nadal tylko wstrzymuje, nie blokuje twardo).

3. **Wykryj niezwiązane brudne ścieżki.** Uruchom `git status --porcelain`; przetnij ze ścieżkami **poza** zestawem dotkniętych. Jeśli takie istnieją, przedstaw je i zapytaj za pomocą `AskUserQuestion`, czy zatwierdzić tylko zaplanowany zestaw (Zalecane), przygotować wszystkie, czy przerwać. Jeśli żadne, pomiń.

4. **Przygotuj jawnie według ścieżki** — `git add` każdy plik w zestawie dotkniętych według nazwy. Nigdy `git add -A` / `git add .`.

5. **Sprawdzenie pustego diffa.** `git diff --cached --quiet`; jeśli wyjście 0, wydrukuj, że faza nie miała diffa (wiersze pozostają bez SHA), ustaw `SHA=""` i przejdź do kroku 8.

6. **Zaproponuj wiadomość Conventional-Commits** i zatwierdź ją za pomocą `AskUserQuestion` (zatwierdź jako zaproponowane / edytuj temat / nadpisz). Temat: `test(<change-id>): <tytuł fazy> (p<N>)`. W treści wspomnij o naturze E2E/poziomu przeglądarki i chronionym ryzyku. Dołącz linię `Refs:`, jeśli rozmowa zawiera rzeczywiste odniesienia Jira/Linear/GitHub (nigdy nie wymyślaj ich z change-id lub gałęzi).

7. **Zatwierdź** za pomocą pojedynczego `git commit` z treścią heredoc, zgodnie z globalnym protokołem wiadomości zatwierdzenia: zatwierdzony temat, a następnie krótka treść wymieniająca dodane specyfikacje + ryzyko, które każda chroni (i linię `Refs:`, gdy ma to zastosowanie). Nigdy nie przekazuj flag `--no-verify` / `--amend` / pomijania podpisywania. Jeśli hak pre-commit zawiedzie, napraw przyczynę i utwórz NOWE zatwierdzenie.

8. **Pobierz i zapisz SHA.** `git rev-parse --short HEAD` → `SHA`. Dla każdego wiersza Postępu zmienionego w tej fazie, Edytuj `- [x] N.M <tytuł>` → `- [x] N.M <tytuł> — <SHA>` (pomiń wiersze, które już zawierają SHA; jeśli `SHA=""`, pomiń — `/10x-archive` wyświetla wiersze bez SHA jako ostrzeżenia informacyjne).

9. **Zaktualizuj `change.md`**: `updated: <today>`; utrzymuj `status: implementing` do ostatniej fazy.

10. **Zresetuj zestaw dotkniętych plików** przed następną fazą.

### Decyzja o następnej fazie

Użyj `AskUserQuestion`:

- question: "Faza [N] ukończona (E2E). Jak postępować?"
  header: "Następna faza"
  options:
  - label: "Kontynuuj do Fazy [N+1]"
    description: "Pozostań w tym kontekście; uruchom bramkę E2E dla następnej fazy i kontynuuj."
  - label: "Najpierw wyczyść kontekst"
    description: "Skopiuj polecenie wznowienia do schowka. Zacznij od nowa dla Fazy [N+1]."
  - label: "Najpierw przejrzyj tę fazę"
    description: "Uruchom /10x-impl-review, aby zweryfikować implementację pod kątem planu przed kontynuowaniem."
    multiSelect: false

**Kontynuuj:** przeczytaj następną fazę, ustaw jej zadanie jako `in_progress`, uruchom bramkę E2E, kontynuuj. Nie ma potrzeby ponownego czytania całego planu.

**Przejrzyj:** uruchom `/10x-impl-review @<ścieżka-do-planu> phase [N]`, a następnie ponownie przedstaw decyzję o kontynuowaniu/wyczyszczeniu (bez opcji przeglądu).

**Wyczyść:** skopiuj `/10x-e2e <change-id> phase [N+1]` do schowka (zgodnie z konwencją schowka) i wyświetl jako `→ /10x-e2e <change-id> phase [N+1] (✓ skopiowano)`.

Jeśli polecono uruchomić wiele faz kolejno, pomiń to pytanie między fazami. Nie zaznaczaj wierszy **ręcznych**, dopóki użytkownik nie potwierdzi.

---

## Śledzenie stanu (tylko sterowane planem)

**Sekcja `## Progress` w `plan.md` jest jedynym źródłem prawdy** — bez pliku stanu, bez znaczników komentarzy. Ta umiejętność modyfikuje Progress dokładnie tak samo jak `/10x-implement` i `/10x-tdd`: zmienia `[ ]` na `[x]` dla każdego kroku, gdy zostanie wykonany; dołącza SHA końcowego zatwierdzenia do każdego zmienionego wiersza, jednorazowo na koniec fazy. W trakcie fazy, ukończone wiersze są `[x]` bez SHA — jest to prawidłowy stan pośredni. Ponieważ wszystkie trzy umiejętności zapisują tę samą sekcję identycznie, zmiana może być obsługiwana przez dowolną z nich, w dowolnej kolejności.

**"Gdzie jestem?" jest wywnioskowane, a nie przechowywane:** pierwsza linia `- [ ]` to następny krok; jej otaczający `### Phase N:` to bieżąca faza; ukończenie to `count([x]) / count([ ] + [x])`.

---

## Po wszystkich fazach (tylko sterowane planem)

Gdy każdy `- [ ]` w całej sekcji `## Progress` jest `[x]`:

1. **Defensywne skanowanie zaległości.** Ponownie przeskanuj w poszukiwaniu pozostałych `- [ ]`. W normalnym przepływie ich nie ma. Jeśli jakieś istnieją (ręczna edycja lub pominięty wyzwalacz je pozostawił), wymień je pogrupowane według Automatyczne/Ręczne i zapytaj za pomocą `AskUserQuestion`, czy **Wstrzymać** (ZATRZYMAJ, nie dotykaj `change.md`) czy **Przejść do epilogu**.

2. **Zaktualizuj `change.md`**: `status: implemented`, `updated: <today>`. (NIE ustawiaj `archived_at` — to jest `/10x-archive`.)

3. **Zatwierdzenie epilogu.** Zapis SHA ostatniej fazy i zmiana statusu `change.md` pozostają brudne po ostatnim rytuale. Przygotuj dokładnie `plan.md` + `change.md` (jawne ścieżki), sprawdź `git diff --cached --quiet` (pomiń, jeśli puste), zaproponuj `chore(<change-id>): close out plan (epilogue)`, zatwierdź i zatwierdź za pomocą heredoc. NIE zapisuj SHA epilogu z powrotem.

4. **Podsumowanie ukończenia + opcjonalny przegląd:**

```
Wszystkie fazy E2E zakończone! 🎉

Podsumowanie:
- Ukończone fazy: [N] ([k] E2E, [j] przekierowane do /10x-tdd lub /10x-implement)
- Dodane testy E2E: [liczba] w [plikach], każdy związany z ryzykiem z test-plan.md
- Dźwignie na miejscu: seed.spec.ts + reguły E2E
```

Następnie `AskUserQuestion`: uruchomić `/10x-impl-review <change-id>` (przegląd całego planu) czy pominąć.

---

## Wytyczne E2E

Zasady, które rządzą każdym testem tutaj — odniesienia zawierają składnię i pełne uzasadnienie:

- **Obserwowalny wynik użytkownika** w rzeczywistych granicach, a nie wewnętrzne wywołanie — i **zawodzi, gdy jego ryzyko się materializuje**, potwierdzone przez celowe sprawdzenie błędu, a nie zakładane.
- **Lokatory oparte na rolach**, **samodzielne i izolowane** (własna konfiguracja/akcja/asercja/czyszczenie, unikalne dane, uwierzytelnianie bez interfejsu użytkownika, bezpieczne w równoległych uruchomieniach w losowej kolejności) oraz **oczekiwanie na stan, nigdy na czas**. Pięć sposobów, w jakie agenci naruszają tę zasadę, znajduje się w `references/e2e-anti-patterns.md`.
- **Chroń nazwane ryzyko, a nie obszar powierzchni** — bez testu na stronę/przycisk, bez nadmiernego mockowania wewnętrznych granic (mockowanie uwierzytelniania + DB, a test nie sprawdza niczego, co może się zepsuć w integracji), bez asercji pikseli dla ryzyk funkcjonalnych (użyj do tego deterministycznych narzędzi wizualnych).

**Rzeczywiste vs zamockowane** to podstawowa wartość testu: wewnętrzne granice (uwierzytelnianie, routing, DB) pozostają rzeczywiste — tam ukrywa się ryzyko integracji; mockuj tylko drogie lub niedeterministyczne zewnętrzne API na warstwie sieciowej.

**Wizja** (`--caps=vision`) jest uzupełnieniem dla ryzyk wyłącznie wizualnych (układ, z-index, animacja, canvas), a nie domyślnym — migawki DOM weryfikują funkcjonalność. **Narzędzia do automatycznej naprawy** pomagają w przypadku dryfu selektora/czasu (kieruj ich wynik przez przegląd PR, nigdy nie zatwierdzaj automatycznie), ale nigdy nie mogą "naprawić" _zmienionego zachowania biznesowego_ — to maskuje regresję, którą test ma wychwycić. Oba są szczegółowo opisane w `references/browser-driven-generation.md`; nieudany test E2E to zadanie debugowania, a nie generowania ani naprawiania.

### Umiejscowienie plików

Postępuj zgodnie z konwencją odkrytą w Konfiguracji. Domyślnie, jeśli żadna nie istnieje: katalog e2e na poziomie projektu, `tests/e2e/<feature>.spec.ts`, jeden test na plik.

### Jeśli utkniesz

Używaj podzadań oszczędnie — `Explore` do szybkiego wyszukiwania plików/wzorców, `general-purpose` do wieloetapowej analizy nieznanego terenu. Najpierw upewnij się, że przeczytałeś odpowiedni kod i rzeczywiste drzewo dostępności działającej aplikacji; baza kodu mogła ewoluować od czasu napisania planu.

## Inne stosy

Seed, reguły i szablon promptu są dostrojone do Playwrighta, a ścieżka sterowana przeglądarką zakłada serwer Playwright CLI lub MCP. W przypadku Cypress, WebdriverIO lub Selenium, zakoduj idiomy swojego narzędzia (jego odpowiednik `getByRole`, jego mechanizm oczekiwania na stan, jego izolację danych) we własnym wariancie tych dźwigni i uruchom jego własny runner. Zasady się przenoszą; składnia nie. `references/e2e-quality-rules.md` zawiera mapowanie dla każdej reguły poza Playwrightem.

## Referencje

- `references/e2e-quality-rules.md` — blok reguł E2E + reguły zarządzające.
- `references/e2e-anti-patterns.md` — pięć antywzorców + dyscyplina ponownego wywoływania promptu.
- `references/seed-test-pattern.md` — egzemplarz `seed.spec.ts` + cztery wzorce.
- `references/e2e-prompt-template.md` — gotowy do wklejenia prompt generowania + przykład.
- `references/browser-driven-generation.md` — samodzielne sterowanie przeglądarką w celu planowania i generowania jednej specyfikacji na ryzyko (przepływ pracy drzewa dostępności, migawka zamiast zrzutów ekranu, jeden test na plik, pisanie na podstawie rzeczywistego wykonania, granica automatycznej naprawy).
