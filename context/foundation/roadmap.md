---
project: CashCheck
version: 1
status: draft
created: 2026-09-02
updated: 2026-09-02
prd_version: 1
main_goal: speed
top_blocker: time
milestone_id: usable-expense-tracker
milestone_seq: 1
milestone_status: open
---

# Mapa drogowa: CashCheck

> Wywiedziono z `context/foundation/prd.md` (v1) + zbadanej bazy kodu.
> Edytuj na miejscu; archiwizuj, gdy zostanie zastąpiona.
> Poniższe fragmenty są wymienione w kolejności zależności. Tabela "W skrócie" jest indeksem.

## Kamień milowy

**M-1: Działający tracker wydatków** — Status: otwarty

- **Cel:** Pełny przepływ Primary z PRD działa na produkcji: zalogowany użytkownik dodaje wydatek jednym zdaniem, poprawia lub zatwierdza propozycję, zarządza wpisami i widzi sumę bieżącego miesiąca wg kategorii.
- **Materiały źródłowe:** `context/foundation/prd.md` (v1)
- **Gotowe, gdy:** każdy S-NN poniżej jest `done`.
- **Kotwice zakresu:** FR-001–FR-007 (musi być), US-01.

## Podsumowanie wizji

Autor nie śledzi wydatków w ogóle, bo tarcie przy wpisie (formularze, kategorie, daty) zabija nawyk — wcześniejsze podejścia upadały właśnie na tym. Hipoteza produktu: jedno zdanie w języku naturalnym zamiast formularza usuwa tarcie na tyle, że śledzenie wydatków staje się codziennym odruchem. Wydatek zapisuje się w 5 sekund, tuż po zakupie, z telefonu.

## Gwiazda przewodnia

**S-01: Użytkownik dodaje wydatek jednym zdaniem i widzi go na liście bieżącego miesiąca** — najmniejszy kompleksowy fragment, którego dostarczenie potwierdza podstawową hipotezę produktu (gwiazda przewodnia — pierwszy przepływ od początku do końca, który udowadnia, że produkt działa; wszystko inne ma znaczenie tylko wtedy, gdy to działa). Sekwencjonowany pierwszy, bo żadne Wymagania wstępne go nie blokują.

## W skrócie

| ID   | Change ID                | Wynik (użytkownik może …)                                     | Wymagania wstępne | Odnośniki PRD                         | Status      |
| ---- | ------------------------ | ------------------------------------------------------------- | ----------------- | ------------------------------------- | ----------- |
| S-01 | add-expense-by-sentence  | dodać wydatek jednym zdaniem i zobaczyć go na liście miesiąca | —                 | FR-001, FR-002, FR-003, FR-004, US-01 | in-progress |
| S-02 | edit-delete-expense      | edytować i usunąć zapisany wydatek                            | S-01              | FR-005, FR-006                        | proposed    |
| S-03 | monthly-category-summary | zobaczyć sumę bieżącego miesiąca wg kategorii                 | S-01              | FR-007                                | proposed    |

## Baza

Co już jest na miejscu w bazie kodu na dzień 2026-09-02 (zbadane w sesji + potwierdzone przez użytkownika).
Fragmenty zakładają, że te elementy są obecne i NIE tworzą ich ponownie.

- **Frontend:** obecny — Astro 6 + React 19 + Tailwind 4 (`src/pages`, `src/components`, `src/layouts`).
- **Backend / API:** częściowy — tylko endpointy auth (`src/pages/api/auth/*`); zero endpointów domenowych.
- **Dane:** częściowy — klient Supabase skonfigurowany (`src/lib/supabase.ts`), projekt produkcyjny podpięty i zweryfikowany; brak migracji i tabel domenowych.
- **Uwierzytelnianie:** obecny — e-mail+hasło end-to-end (`src/middleware.ts` z `PROTECTED_ROUTES`, strony i endpointy auth) — zweryfikowane na produkcji.
- **Wdrożenie / infrastruktura:** obecny — Cloudflare Workers wdrożone (`wrangler.jsonc`, `context/deployment/deploy-plan.md`), CI na GitHub Actions z sekretami.
- **Obserwowalność:** częściowy — observability Workers włączone + `wrangler tail`; brak śledzenia błędów w kodzie aplikacji.

## Fundamenty

Brak. Uwierzytelnianie i wdrożenie są obecne w bazie; praca nad warstwą danych (tabela wydatków z politykami dostępu wiersz-po-wierszu) ląduje w S-01 — pierwszym fragmencie, który jej potrzebuje — zgodnie z zasadą progresywnego ujawniania.

## Fragmenty

### S-01: Użytkownik dodaje wydatek jednym zdaniem

- **Wynik:** użytkownik może wpisać jedno zdanie („biedronka 87,50"), zobaczyć propozycję (kwota, kategoria, data), zaakceptować ją lub poprawić, a zapisany wydatek widzi na liście bieżącego miesiąca.
- **Change ID:** add-expense-by-sentence
- **Odnośniki PRD:** FR-002, FR-003, FR-004, US-01; FR-001 (fragment domyka wymóg dostępu: nowe trasy wydatków wchodzą do `PROTECTED_ROUTES`, a dane są rozdzielone per użytkownik zgodnie z sekcją Access Control)
- **Wymagania wstępne:** — (auth obecne per Baza; produkcyjny projekt bazy danych podpięty)
- **Równolegle z:** —
- **Blokery:** —
- **Niewiadome:**
  - Który dostawca/model wykonuje klasyfikację zdania i jakim kosztem? — Właściciel: użytkownik (decyzję proponuje badanie w planowaniu). Blok: nie.
  - Jaki jest ustalony zestaw kategorii wydatków? — Właściciel: użytkownik (planowanie proponuje domyślny zestaw do zatwierdzenia). Blok: nie.
- **Ryzyko:** największy fragment kamienia milowego — trzymany w całości, bo klauzula „Then" US-01 wymaga, by zapisany wydatek był widoczny na liście; wydzielenie listy uniemożliwiłoby weryfikację przepływu od początku do końca. Przy zapisie obowiązuje reguła z lessons.md: przekierowanie po zapisie z odpowiedzi w ręku, nie ze świeżego odczytu magazynu.
- **Status:** in-progress

### S-02: Użytkownik edytuje i usuwa wydatek

- **Wynik:** użytkownik może edytować każde pole zapisanego wydatku oraz usunąć wydatek.
- **Change ID:** edit-delete-expense
- **Odnośniki PRD:** FR-005, FR-006
- **Wymagania wstępne:** S-01
- **Równolegle z:** S-03
- **Blokery:** —
- **Niewiadome:** —
- **Ryzyko:** formularz edycji naturalnie reużywa interfejsu poprawki propozycji z S-01 — sekwencjonowanie po S-01 zapobiega budowaniu tego samego formularza dwa razy.
- **Status:** proposed

### S-03: Użytkownik widzi podsumowanie miesiąca wg kategorii

- **Wynik:** użytkownik może zobaczyć sumy bieżącego miesiąca w podziale na kategorie (prosta tabela).
- **Change ID:** monthly-category-summary
- **Odnośniki PRD:** FR-007
- **Wymagania wstępne:** S-01
- **Równolegle z:** S-02
- **Blokery:** —
- **Niewiadome:** —
- **Ryzyko:** czysty odczyt danych z S-01 — najmniejszy fragment; sekwencjonowany po S-01 wyłącznie przez zależność od danych.
- **Status:** proposed

## Przekazanie do backlogu

| Identyfikator mapy drogowej | Identyfikator zmiany     | Sugerowany tytuł problemu                                      | Gotowe do planowania | Uwagi                                       |
| --------------------------- | ------------------------ | -------------------------------------------------------------- | -------------------- | ------------------------------------------- |
| S-01                        | add-expense-by-sentence  | Dodawanie wydatku jednym zdaniem z propozycją do zatwierdzenia | yes                  | Uruchom `/10x-plan add-expense-by-sentence` |
| S-02                        | edit-delete-expense      | Edycja i usuwanie zapisanych wydatków                          | no                   | Czeka na S-01                               |
| S-03                        | monthly-category-summary | Podsumowanie bieżącego miesiąca wg kategorii                   | no                   | Czeka na S-01                               |

## Otwarte pytania dotyczące mapy drogowej

1. **Czy podnieść framework o wersję główną po dostarczeniu MVP?** — Właściciel: użytkownik. Blokuje: nic (decyzja po 2026-09-14; szczegóły w rejestrze ryzyka `context/foundation/infrastructure.md`).

## Zaparkowane

- **Ręczny formularz dodawania wydatku (FR-008, miły dodatek)** — Dlaczego zaparkowane: cel „szybkość dostarczenia" parkuje elementy nieistotne; poprawka propozycji w S-01 (FR-003) daje pośrednio ręczną kontrolę.
- **Integracje z bankiem i import danych (CSV, paragony)** — PRD §Poza zakresem: inna skala złożoności.
- **Budżety, limity i alerty** — PRD §Poza zakresem: MVP mierzy wydatki, nie egzekwuje dyscypliny.
- **Historia miesięcy i wykresy** — PRD §Poza zakresem: świadoma decyzja z rundy pytań przy FR-007.
- **Współdzielenie danych i role** — PRD §Poza zakresem: jeden użytkownik widzi wyłącznie swoje dane.

## Historia kamieni milowych

(puste — pierwszy kamień milowy)

## Zrobione

(puste przy pierwszym generowaniu — wpisy dodaje archiwizacja zmian)
