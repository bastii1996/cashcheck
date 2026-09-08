---
change_id: extract-json-helper
title: Wspólny helper odpowiedzi JSON dla endpointów API
status: archived
created: 2026-09-07
updated: 2026-09-08
archived_at: 2026-09-08T05:18:00Z
---

## Notes

Ćwiczenie m2l5 (praca równoległa, worktree + agent autonomiczny). Research m2l4
wykazał: helper `json()` zduplikowany dosłownie w `api/expenses/index.ts:7-12`
i `[id].ts:7-12`, a `parse.ts` inline'uje `new Response(JSON.stringify(...))`
czterokrotnie. Zakres: `src/lib/http.ts` z jedną funkcją `json(status, body)`,
podmiana we wszystkich trzech plikach. Zero zmian zachowania.

## Wynik

Zrealizowane autonomicznie w izolowanym worktree (commit `c3b0d34`), przejrzane
i zmergowane do main. Bez zmian zachowania: statusy i ciała odpowiedzi 1:1;
`204` i nagłówki CSV zostały inline, bo nie są JSON-em.
