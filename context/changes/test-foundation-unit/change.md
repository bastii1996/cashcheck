---
change_id: test-foundation-unit
title: Fundament testów — runner Vitest i jednostkowe parsera oraz walidacji
status: implemented
created: 2026-09-04
updated: 2026-09-04
archived_at: null
---

## Notes

Faza 1 wdrożenia z context/foundation/test-plan.md (§3). Cel: postawić runner i udowodnić ochronę ryzyk #1 (kontrakt parsowania — normalizacja kwot/kategorii/dat względnych, degradacja z parse_error) oraz #5 (schemat walidacji zapisu — daty graniczne, przecinki, polskie znaki) golden-zestawem, którego oczekiwania są spisane z wymagań, NIE z kodu (problem wyroczni — patrz Risk Response Guidance #1). Granica lekcji: bez hooków i CI YAML (to m3l3+); podłączenie testów do CI należy do fazy 4 planu.
