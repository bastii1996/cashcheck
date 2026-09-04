---
change_id: fix-month-window
title: Fix — okno miesiąca egzekwowane tylko w SSR (lista i podsumowanie kłamią do reloadu)
status: opened
created: 2026-09-04
updated: 2026-09-04
---

## Notes

Ćwiczenie m3l5 (debugging-as-test): dowody → reprodukcja → czerwony test → fix →
regresja. Bug znaleziony lekturą kodu przy budowie E2E (m3l4), potwierdzony
reprodukcją Playwright. Kontrakt: PRD FR-007 — widok i podsumowanie dotyczą
bieżącego miesiąca.
