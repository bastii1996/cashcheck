# Lessons Learned

> Rejestr tylko do dodawania powtarzających się reguł i wzorców. Odczytywany ponownie na początku przez /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Verify starter defaults against actual repo state before first push

- **Kontekst**: każdy projekt scaffoldowany ze startera/szablonu — konfiguracja CI, nazwy gałęzi, wersje narzędzi
- **Problem**: starter 10x-astro-starter triggeruje CI na gałęzi `master`, a repo używa `main` — workflow nigdy by się nie uruchomił i cicho nie strzegłby jakości (wykryte przy m1l4)
- **Reguła**: Po scaffoldingu, przed pierwszym pushem, porównaj założenia startera (gałęzie w CI, wersja Node, ścieżki) z faktycznym stanem repo i napraw rozjazdy
- **Dotyczy**: plan, implement, impl-review
