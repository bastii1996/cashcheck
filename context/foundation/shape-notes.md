---
project: "CashCheck"
context_type: greenfield
created: 2026-08-31
updated: 2026-08-31
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "auth strategy"
      decision: "email + hasło; płaski model użytkownika, bez ról"
    - topic: "zakres persony"
      decision: "jeden konkretny użytkownik — autor projektu"
    - topic: "budżet czasowy"
      decision: "2 tygodnie po godzinach, twardy deadline 2026-09-14"
    - topic: "skala"
      decision: "small — autor + garść osób"
  frs_drafted: 8
  quality_check_status: accepted
---

# Shape notes — tracker wydatków z wpisem w języku naturalnym

**Pomysł początkowy (dosłownie):** tracker wydatków, w którym wpisuję jedno zdanie typu „biedronka 87,50", AI parsuje kwotę/kategorię/datę, ja zatwierdzam; lista wydatków z edycją i usuwaniem oraz proste miesięczne podsumowanie.

## Vision & Problem Statement

Ból: autor nie śledzi wydatków w ogóle — pod koniec miesiąca nie wie, gdzie poszły pieniądze.
Osoba: autor projektu (jeden konkretny użytkownik).
Moment: tuż po zakupie / płatności — chce zapisać wydatek w 5 sekund, zanim zapomni.
Koszt dziś: brak jakiejkolwiek kontroli nad wydatkami; wcześniejsze podejścia (arkusze, apki) upadały przez tarcie przy wpisywaniu.

Wgląd: to nie brak narzędzi zabija śledzenie wydatków, tylko tarcie przy wpisie (formularze, kategorie, daty). Jedno zdanie w języku naturalnym zamiast formularza usuwa tarcie, które sprawia, że ludzie porzucają śledzenie.

## User & Persona

Persona główna: autor projektu — osoba pracująca, chce kontrolować osobiste wydatki. Sięga po produkt w momencie płatności (telefon w ręce, wychodząc ze sklepu). Nie ma cierpliwości do formularzy; jeśli wpis zajmie więcej niż kilka sekund, porzuci nawyk.

## Access Control

Logowanie e-mail + hasło. Płaski model użytkownika — bez ról. Każdy zalogowany użytkownik widzi i modyfikuje wyłącznie własne wydatki. Niezalogowany użytkownik nie ma dostępu do żadnych danych — trafia na ekran logowania/rejestracji.

## Success Criteria

### Primary

- Działa pełny przepływ: loguję się → wpisuję „biedronka 87,50" → widzę propozycję (kwota/kategoria/data) → zatwierdzam → wydatek jest na liście → widzę sumę bieżącego miesiąca wg kategorii.

### Secondary

- Autor używa aplikacji codziennie przez tydzień (miernik nawyku — tarcie wpisu jest realnie niskie).

### Guardrails

- Prywatność danych: użytkownik nigdy nie widzi wydatków innego użytkownika.

## Timeline

Budżet: mvp_weeks: 2, hard_deadline: 2026-09-14, after_hours_only: true. Zakres cięty pod ten limit (6-krokowy przepływ MVP zaakceptowany jako dostarczalny w 2 tygodnie).

## Functional Requirements

- FR-001: Użytkownik może się zarejestrować i zalogować (e-mail + hasło). Priorytet: musi być
  > Sokrates: Rozważono kontrargumenty (tarcie logowania, zbędność auth dla 1 usera). Rozwiązanie: brak kontrargumentu — pozostaje bez zmian.
- FR-002: Użytkownik może dodać wydatek, wpisując jedno zdanie w języku naturalnym. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "dla wprawnego użytkownika 3-polowy formularz bywa szybszy niż zdanie." Rozwiązanie: zachowano — to jest właśnie hipoteza produktu, testowana kryterium Secondary (tydzień codziennego użycia).
- FR-003: Użytkownik widzi propozycję (kwota, kategoria, data) wyprowadzoną z jego zdania i może ją zaakceptować lub poprawić przed zapisem. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "krok akceptacji dodaje klik przy każdym wpisie; zapis od razu byłby szybszy." Rozwiązanie: zachowano — bez akceptacji błędne kategorie psują podsumowanie po cichu; kontrola buduje zaufanie do propozycji.
- FR-004: Użytkownik widzi listę własnych wydatków, domyślnie z bieżącego miesiąca. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "płaska lista wszystkich wydatków szybko stanie się nieczytelna." Rozwiązanie: zachowano z doprecyzowaniem — lista domyślnie pokazuje bieżący miesiąc.
- FR-005: Użytkownik może edytować zapisany wydatek. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "edycję zastępuje usuń+dodaj." Rozwiązanie: użytkownik początkowo przyjął kontrargument (degradacja do 'miły dodatek'), po ujawnieniu kosztu (kompletność CRUD — Update — wymagana przez kryteria projektu) świadomie przywrócił 'musi być'.
- FR-006: Użytkownik może usunąć wydatek. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "usuwanie kusi do 'czyszczenia' historii, co fałszuje podsumowania." Rozwiązanie: zachowano — to dane użytkownika i jego decyzja.
- FR-007: Użytkownik widzi podsumowanie bieżącego miesiąca wg kategorii. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "bez historii poprzednich miesięcy wartość jest krótka." Rozwiązanie: zachowano w wersji minimum (bieżący miesiąc); historia miesięcy jawnie poza MVP (Non-Goals).
- FR-008: Użytkownik może dodać wydatek ręcznym formularzem (bez AI). Priorytet: miły dodatek
  > Sokrates: Rozważono kontrargument: "poprawka propozycji w FR-003 już daje ręczną kontrolę — formularz jest niemal redundantny." Rozwiązanie: zachowano jako miły dodatek — przydatny, gdy parsowanie całkiem zawiedzie.

## User Stories

### US-01: Użytkownik dodaje wydatek jednym zdaniem

- **Given** zalogowany użytkownik
- **When** wpisuje „biedronka 87,50" i zatwierdza propozycję
- **Then** wydatek z kwotą 87,50, kategorią Żywność i dzisiejszą datą jest na liście, a suma bieżącego miesiąca rośnie

#### Acceptance Criteria

- Propozycja pokazuje kwotę, kategorię i datę przed zapisem; każde pole można poprawić
- Zatwierdzony wydatek pojawia się na liście bieżącego miesiąca bez przeładowania strony
- Suma miesiąca wg kategorii uwzględnia nowy wydatek

## Business Logic

Aplikacja zamienia jedno zdanie użytkownika na ustrukturyzowany wydatek — wyprowadza z niego kwotę, kategorię i datę — a użytkownik zatwierdza lub poprawia tę klasyfikację przed zapisem.

Wejściem reguły jest swobodne zdanie użytkownika (np. „biedronka 87,50", „paliwo 200 zł wczoraj"). Wyjściem jest propozycja wydatku: kwota, kategoria z ustalonego zestawu kategorii oraz data (domyślnie dzisiejsza, chyba że zdanie mówi inaczej). Użytkownik napotyka regułę przy każdym wpisie: zdanie → propozycja → akceptacja lub poprawka → zapis. Reguła jest sformułowana niezależnie od implementacji — nie przesądza, co wykonuje klasyfikację.

## Non-Functional Requirements

- Od wysłania zdania do pokazania propozycji mija ≤ 3 s (p95); podczas każdej operacji dłuższej niż 2 s użytkownik widzi ciągłą informację zwrotną.
- Powracający użytkownik na tym samym urządzeniu nie musi logować się częściej niż raz na 30 dni.
- Pełny przepływ wpisu (zdanie → propozycja → zatwierdzenie) jest wygodnie użyteczny na ekranie telefonu — tam powstaje większość wpisów.

## Non-Goals

- Bez integracji z bankiem i importu danych (CSV, paragony) — jedynym wejściem jest ręczny wpis zdaniem; integracje to zupełnie inna skala złożoności.
- Bez budżetów, limitów i alertów — MVP mierzy wydatki, nie egzekwuje dyscypliny.
- Bez historii miesięcy i wykresów — tylko bieżący miesiąc w prostej tabeli (świadoma decyzja z rundy Sokratesa przy FR-007).
- Bez współdzielenia danych i ról — jeden użytkownik widzi wyłącznie swoje dane; wspólne budżety domowe poza zakresem.

## Product framing

- product_type: web-app (użytkownik zadeklarował aplikację webową; wpis głównie z telefonu — patrz NFR o użyteczności mobilnej)
- target_scale: users: small, qps: low, data_volume: small
- timeline_budget: mvp_weeks: 2, hard_deadline: 2026-09-14, after_hours_only: true

## Quality cross-check

Wszystkie elementy obecne: kontrola dostępu ✓, logika biznesowa (reguła jednolinijkowa) ✓, artefakty projektu ✓, potwierdzenie kosztu czasowego ✓ (mvp_weeks: 2 ≤ 3), non-goals ✓. Brak luk.

## Forward: tech-stack

Użytkownik z góry zadeklarował preferencję stosu: Astro + React + Supabase (rekomendowany w jego środowisku nauki). Informacyjne — do podjęcia przez krok wyboru stosu, nie część PRD.
