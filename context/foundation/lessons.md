# Lessons Learned

> Rejestr tylko do dodawania powtarzających się reguł i wzorców. Odczytywany ponownie na początku przez /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Verify starter defaults against actual repo state before first push

- **Kontekst**: każdy projekt scaffoldowany ze startera/szablonu — konfiguracja CI, nazwy gałęzi, wersje narzędzi
- **Problem**: starter 10x-astro-starter triggeruje CI na gałęzi `master`, a repo używa `main` — workflow nigdy by się nie uruchomił i cicho nie strzegłby jakości (wykryte przy m1l4)
- **Reguła**: Po scaffoldingu, przed pierwszym pushem, porównaj założenia startera (gałęzie w CI, wersja Node, ścieżki) z faktycznym stanem repo i napraw rozjazdy
- **Dotyczy**: plan, implement, impl-review

## Treat a green build exit code as insufficient evidence that output is correct

- **Kontekst**: każda faza budująca artefakt wdrożeniowy na Cloudflare workerd (Astro SSR + @astrojs/cloudflare)
- **Problem**: znany bug adaptera zapisuje obcięty HTML i kończy proces kodem 0 (withastro/astro#17047) — CI jest zielone, a wdrożona strona zepsuta; awarię wykrywa użytkownik, nie pipeline
- **Reguła**: Po każdym buildzie sprawdź zawartość `dist/` (obecność oczekiwanych stron i nietrywialne rozmiary plików), zanim uznasz build za udany; nie polegaj wyłącznie na kodzie wyjścia
- **Dotyczy**: implement, impl-review

## Never read session state immediately after writing it on eventually-consistent storage

- **Kontekst**: przepływy uwierzytelniania i każdy zapis-a-potem-odczyt do Cloudflare KV (domyślny magazyn sesji Astro na Workers)
- **Problem**: KV propaguje zapisy globalnie do 60 s; logowanie z natychmiastowym przekierowaniem na trasę chronioną może odczytać nieaktualny stan i odbić użytkownika na ekran logowania. Bug nie reprodukuje się lokalnie, gdzie magazyn jest natychmiastowy
- **Reguła**: Przekierowanie po zapisie wyprowadzaj z odpowiedzi, którą endpoint już trzyma w ręku, a nie ze świeżego odczytu magazynu sesji
- **Dotyczy**: plan, implement, impl-review
