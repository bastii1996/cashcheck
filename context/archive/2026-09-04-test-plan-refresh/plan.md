# Plan — test-plan-refresh-2026-09-04

Jedna faza: zsynchronizować `context/foundation/test-plan.md` ze stanem po m3l3/m3l4.
Wyłącznie §4/§5/§6/§8 + nota statusowa w §3 Fazie 4; §1/§2 nietykalne (zakres
zaakceptowany przez użytkownika). Wszystkie fakty z research.md — bez nowych badań.

## Phase 1: Aktualizacja przewodnika

### Changes Required

- §4 Stack: wiersz `e2e` → Playwright (wersja z package.json), notes: dźwignie
  seed + reguły w `tests/e2e/`, storageState, webServer dev; utrzymany budżet
  „jeden test na ryzyko" i zasada smoke produkcyjnego jako bramki przepływu
  krytycznego (E2E nie zastępuje Fazy 3). Dopisać wiersz `e2e auth/dane` lub
  rozszerzyć notes o konto smoke z `.env`.
- §5 Quality Gates: wiersz haka → `wired (m3l3)`; nowy wiersz
  `pełna suita + typecheck (pre-push) | local | required (m3l3) | regresje przed wypchnięciem`;
  wiersz e2e: `e2e (Playwright, ryzyka przeglądarkowe) | local | recommended (m3l4; CI po §3 Fazie 4)`.
- §3 Faza 4: w celu dopisać nawias „(lokalna połowa wdrożona w m3l3 — hak per-edit
  i pre-push; zostaje okablowanie CI)". Status pozostaje `not started`.
- §6: nowa podsekcja `6.6 Adding an E2E test` (Location `tests/e2e/<feature>.spec.ts`,
  wzorzec: seed.spec.ts + reguły tests/e2e/AGENTS.md, oracle z ryzyka test-planu,
  run: `npx playwright test tests/e2e/<plik>.spec.ts`, zasada celowego uszkodzenia);
  w 6.5 nota 2 linie o m3l3/m3l4.
- §8 Freshness Ledger: daty przeglądu strategii i stosu → 2026-09-04 (bez zmiany
  reguł refresh).

### Success Criteria

- Przewodnik nie zawiera już „e2e: brak — celowo" ani „recommended after §3 Phase 4"
  przy haku; `grep` na te frazy pusty.
- §6.6 pozwala agentowi dodać test E2E bez czytania historii sesji (lokalizacja,
  wzorzec, komenda, weryfikacja sabotażem).
- §1/§2 bajt-w-bajt bez zmian (poza niczym — diff nie dotyka tych sekcji).

## Progress

- [x] 1.1 §4 stack: wiersz e2e → Playwright + notes — 79db788
- [x] 1.2 §5 gates: hook wired, pre-push, e2e — 79db788
- [x] 1.3 §3 Faza 4 nota + §6.5/§6.6 cookbook — 79db788
- [x] 1.4 §8 daty + kontrola success criteria (grep pusty, hunki poza §1/§2) — 79db788
