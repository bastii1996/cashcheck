---
change_id: align-auth-endpoints
title: Wyrównanie starterowych endpointów auth do konwencji AGENTS.md (F7)
status: archived
created: 2026-09-07
updated: 2026-09-08
archived_at: 2026-09-08T05:18:00Z
---

## Notes

Ćwiczenie m2l5 + zaległy chip F7 z impl-review (add-expense-by-sentence).
Research m2l4: `api/auth/signin.ts`, `signup.ts`, `signout.ts` nie mają
`export const prerender = false` (twarda reguła AGENTS.md dla tras API) i nie
walidują wejścia zodem jak endpointy expenses. Zakres: dodać prerender,
walidację obecności pól przez zod (spójnie z resztą repo), bez zmiany logiki
przekierowań. Zero zmian kontraktu dla poprawnych żądań.

## Wynik

Zrealizowane autonomicznie w izolowanym worktree (commit `b5c7b91`), przejrzane
i zmergowane do main. Zamyka chip F7. Poprawne żądania bez zmian (te same
wywołania Supabase i redirecty); niepoprawne dostają teraz redirect z czytelnym
`?error=` przed dotknięciem Supabase — zweryfikowane smoke'em: puste hasło,
zły email i brak pól dają 302 z komunikatem.

## Lekcja z pracy równoległej (m2l5)

Dwa worktree = dwie zmiany bez kolizji plików, ale merge ujawnił kruchy test E2E
(wyścig z hydratacją wyspy). To dokładnie „ból jakości" z lekcji: przepustowość
ograniczona zdolnością przeglądu — wąskim gardłem było przejrzenie diffów
i naprawa testu, nie generowanie kodu.
