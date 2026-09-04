---
change_id: test-plan-refresh-2026-09-04
title: Odświeżenie test-planu — Playwright (m3l4) i lokalne bramki (m3l3) w umowie jakości
status: archived
created: 2026-09-04
updated: 2026-09-04
archived_at: 2026-09-04T07:09:01Z
---

## Notes

Refresh z §8 test-planu (trigger: zmiana stosu — nowy runner testów). Lekcje m3l3/m3l4
wprowadziły rzeczywistość, której zamrożony przewodnik nie opisuje:

- m3l3: hak per-edit (PostToolUse: prettier + `vitest related` na obszarach ryzyka)
  oraz bramka pre-push (pełna suita Vitest + `astro check`) — §5 wciąż mówi
  „recommended after §3 Phase 4" i nie zna pre-push.
- m3l4: Playwright E2E (config + storageState, dźwignie seed.spec.ts +
  tests/e2e/AGENTS.md, test ryzyka #1 potwierdzony celowym uszkodzeniem) — §4 wciąż
  mówi „e2e: brak — celowo".
- §6 nie ma wzorca „jak dodać test E2E"; §8 daty świeżości do podbicia.

Zakres zaakceptowany przez użytkownika: §4, §5, §6, §8. §1/§2 (strategia, mapa ryzyka)
bez zmian — brak nowych ryzyk i incydentów. Nota do §3 Fazy 4: lokalna połowa bramek
już okablowana (m3l3); zostaje część CI.
