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

## Clear the Vite cache before debugging dev-only hydration or SSR failures

- **Kontekst**: serwer dev Astro/Vite po zmianach grafu modułów (nowy moduł, przeniesione eksporty, zmienione importy między wyspą a serwerem)
- **Problem**: stale `node_modules/.vite` dwukrotnie dał fałszywe objawy błędu aplikacji — crash `jsxDEV is not a function` oraz cicha nie-hydratacja wyspy React (przycisk „Dodaj" wiecznie disabled, E2E czerwone), podczas gdy kod był poprawny; build produkcyjny nie ma tego problemu
- **Reguła**: Gdy objaw istnieje tylko na serwerze dev po zmianach importów/modułów, najpierw `rm -rf node_modules/.vite` i restart serwera, dopiero potem szukaj winy w kodzie aplikacji
- **Dotyczy**: implement, debugging

## Wait for island hydration before driving a partially-hydrated UI in tests

- **Kontekst**: testy E2E (Playwright) na stronach Astro z wyspami `client:load`, zwłaszcza przeciw serwerowi dev
- **Problem**: `fill`/`click` wykonane między renderem SSR a hydratacją wpadają w próżnię — DOM przyjmuje tekst, ale stan React go nie widzi, więc przycisk zależny od stanu zostaje `disabled` do timeoutu. Objaw wygląda jak zepsuta aplikacja albo flake, a naprawdę jest wyścigiem testu z hydratacją; ujawnia się dopiero, gdy coś wydłuży kompilację (nowy moduł, zimny cache Vite) — u nas po dodaniu eksportu CSV
- **Reguła**: Przed pierwszą interakcją z wyspą czekaj na stan hydratacji (`astro-island[ssr]` → 0 sztuk; helper `tests/e2e/hydration.ts`), po każdym `goto` i `reload`. Nigdy nie „naprawiaj" tego `waitForTimeout`
- **Dotyczy**: e2e, implement, debugging
