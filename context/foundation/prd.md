---
project: "CashCheck"
version: 1
status: draft
created: 2026-08-31
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 2
  hard_deadline: 2026-09-14
  after_hours_only: true
---

# CashCheck — PRD

## Vision & Problem Statement

Autor projektu nie śledzi wydatków w ogóle — pod koniec miesiąca nie wie, gdzie poszły pieniądze. Ból pojawia się tuż po zakupie lub płatności: chce zapisać wydatek w 5 sekund, zanim zapomni, a wcześniejsze podejścia (arkusze, aplikacje) upadały przez tarcie przy wpisywaniu. Kosztem status quo jest brak jakiejkolwiek kontroli nad wydatkami.

Wgląd: to nie brak narzędzi zabija śledzenie wydatków, tylko tarcie przy wpisie (formularze, kategorie, daty). Jedno zdanie w języku naturalnym zamiast formularza usuwa tarcie, które sprawia, że ludzie porzucają śledzenie.

## User & Persona

Persona główna: autor projektu — osoba pracująca, chce kontrolować osobiste wydatki. Sięga po produkt w momencie płatności (telefon w ręce, wychodząc ze sklepu). Nie ma cierpliwości do formularzy; jeśli wpis zajmie więcej niż kilka sekund, porzuci nawyk.

## Success Criteria

### Primary

- Działa pełny przepływ: loguję się → wpisuję „biedronka 87,50" → widzę propozycję (kwota/kategoria/data) → zatwierdzam → wydatek jest na liście → widzę sumę bieżącego miesiąca wg kategorii.

### Secondary

- Autor używa aplikacji codziennie przez tydzień (miernik nawyku — tarcie wpisu jest realnie niskie).

### Guardrails

- Prywatność danych: użytkownik nigdy nie widzi wydatków innego użytkownika.

## User Stories

### US-01: Użytkownik dodaje wydatek jednym zdaniem

- **Given** zalogowany użytkownik
- **When** wpisuje „biedronka 87,50" i zatwierdza propozycję
- **Then** wydatek z kwotą 87,50, kategorią Żywność i dzisiejszą datą jest na liście, a suma bieżącego miesiąca rośnie

#### Acceptance Criteria

- Propozycja pokazuje kwotę, kategorię i datę przed zapisem; każde pole można poprawić
- Zatwierdzony wydatek pojawia się na liście bieżącego miesiąca bez przeładowania strony
- Suma miesiąca wg kategorii uwzględnia nowy wydatek

## Functional Requirements

- FR-001: Użytkownik może się zarejestrować i zalogować (e-mail + hasło). Priorytet: musi być
  > Sokrates: Rozważono kontrargumenty (tarcie logowania, zbędność uwierzytelniania dla jednego użytkownika). Rozwiązanie: brak kontrargumentu — pozostaje bez zmian.
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
- FR-008: Użytkownik może dodać wydatek ręcznym formularzem, z pominięciem propozycji automatycznej. Priorytet: miły dodatek
  > Sokrates: Rozważono kontrargument: "poprawka propozycji w FR-003 już daje ręczną kontrolę — formularz jest niemal redundantny." Rozwiązanie: zachowano jako miły dodatek — przydatny, gdy wyprowadzanie propozycji całkiem zawiedzie.

## Non-Functional Requirements

- Od wysłania zdania do pokazania propozycji mija ≤ 3 s (p95); podczas każdej operacji dłuższej niż 2 s użytkownik widzi ciągłą informację zwrotną.
- Powracający użytkownik na tym samym urządzeniu nie musi logować się częściej niż raz na 30 dni.
- Pełny przepływ wpisu (zdanie → propozycja → zatwierdzenie) jest wygodnie użyteczny na ekranie telefonu — tam powstaje większość wpisów.

## Business Logic

Aplikacja zamienia jedno zdanie użytkownika na ustrukturyzowany wydatek — wyprowadza z niego kwotę, kategorię i datę — a użytkownik zatwierdza lub poprawia tę klasyfikację przed zapisem.

Wejściem reguły jest swobodne zdanie użytkownika (np. „biedronka 87,50", „paliwo 200 zł wczoraj"). Wyjściem jest propozycja wydatku: kwota, kategoria z ustalonego zestawu kategorii oraz data (domyślnie dzisiejsza, chyba że zdanie mówi inaczej). Użytkownik napotyka regułę przy każdym wpisie: zdanie → propozycja → akceptacja lub poprawka → zapis. Reguła jest sformułowana niezależnie od implementacji — nie przesądza, co wykonuje klasyfikację.

## Access Control

Logowanie e-mail + hasło. Płaski model użytkownika — bez ról. Każdy zalogowany użytkownik widzi i modyfikuje wyłącznie własne wydatki. Niezalogowany użytkownik nie ma dostępu do żadnych danych — trafia na ekran logowania/rejestracji.

## Non-Goals

- Bez integracji z bankiem i importu danych (CSV, paragony) — jedynym wejściem jest ręczny wpis zdaniem; integracje to zupełnie inna skala złożoności.
- Bez budżetów, limitów i alertów — MVP mierzy wydatki, nie egzekwuje dyscypliny.
- Bez historii miesięcy i wykresów — tylko bieżący miesiąc w prostej tabeli (świadoma decyzja z rundy Sokratesa przy FR-007).
- Bez współdzielenia danych i ról — jeden użytkownik widzi wyłącznie swoje dane; wspólne budżety domowe poza zakresem.

## Open Questions

1. **Czy podnieść framework o wersję główną po dostarczeniu MVP?** — Właściciel: użytkownik. Termin: po 2026-09-14. Świadomie odroczone: bieżąca gałąź frameworka jest w trybie utrzymaniowym i pozostawia 4 nienaprawione podatności (szczegóły i łagodzenie w rejestrze ryzyka `context/foundation/infrastructure.md`). Nie blokuje MVP.
