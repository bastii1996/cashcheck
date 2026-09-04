# Fundament testów — Krótki plan

> Pełny plan: `context/changes/test-foundation-unit/plan.md` · Badanie: `research.md`

## Co i dlaczego

Faza 1 wdrożenia test-planu: Vitest + golden-testy parsera (ryzyko #1) i testy schematu zapisu (ryzyko #5). Wyrocznie z wymagań, nie z kodu — obrona przed testami tautologicznymi.

## Kluczowe podjęte decyzje

| Decyzja                           | Wybór                                                           | Dlaczego                                                                                        | Źródło             |
| --------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------ |
| Odblokowanie `cloudflare:workers` | Alias w vitest.config → stub `env`                              | Zero zmian produkcyjnych; golden przez publiczne API wierniejszy niż eksport prywatnych funkcji | Research           |
| Konfiguracja                      | Zwykły vitest.config.ts (bez getViteConfig z Astro)             | Boot configu Astro ciągnąłby adapter Cloudflare                                                 | Research           |
| Zakres mocków                     | Wyłącznie granica modelu (`env.AI.run`)                         | Reguła z test-planu: nigdy moduły wewnętrzne                                                    | Test-plan §2       |
| Luka `parse_error`                | Test wg wymagania najpierw (czerwony), potem minimalna poprawka | Bełkot z modelu = awaria z flagą (Risk Response #1); dowód wartości wyroczni z wymagań          | Research/Test-plan |

## Fazy w skrócie

| Faza      | Dostarcza                                   | Ryzyko                                         |
| --------- | ------------------------------------------- | ---------------------------------------------- |
| 1. Runner | vitest + aliasy + stub + smoke              | rozwiązywalność specyfikatora CF               |
| 2. Testy  | golden parsera + schemat + red→green + §6.1 | flake okna dat o północy (liczone w Warszawie) |

## Kryteria sukcesu (podsumowanie)

`npm test` zielone bez sieci; lint/check/build nietknięte; każda wyrocznia z komentarzem źródła; §3 fazy 1 → complete.
