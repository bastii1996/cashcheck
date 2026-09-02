---
project: CashCheck
planned_at: 2026-09-02
platform: Cloudflare Workers
worker_name: cashcheck
inputs:
  - context/foundation/infrastructure.md
  - context/foundation/tech-stack.md
status: executed
---

# Deploy plan — pierwsze wdrożenie CashCheck na Cloudflare Workers

Cel: opublikować obecny stan aplikacji (starter + auth Supabase, bez logiki wydatków)
pod publicznym URL `*.workers.dev`, z sekretami produkcyjnymi i działającym CI.

**Uwaga krytyczna z infrastructure.md**: komendy Pages i Workers NIE są zamienne.
Adapter @astrojs/cloudflare nie wspiera już Pages — używamy wyłącznie `wrangler deploy`
(Workers). Żadnych `wrangler pages deploy`.

## Kroki wykonywane przez agenta

1. **Build + weryfikacja artefaktu** — `npm run build`, potem inspekcja `dist/`
   (obecność `_worker.js`/assets i nietrywialne rozmiary plików). Zielony kod wyjścia
   NIE wystarcza — znany bug workerd potrafi zapisać obcięty HTML z kodem 0
   (rejestr ryzyka, wiersz 1).
2. **Pierwszy deploy** — `npx wrangler deploy` (tworzy Workera `cashcheck`,
   drukuje URL `https://cashcheck.<subdomain>.workers.dev`).
3. **Sekrety produkcyjne** — `npx wrangler secret put SUPABASE_URL` oraz
   `npx wrangler secret put SUPABASE_KEY` (wartości z lokalnego `.env`, podane
   przez stdin — nie trafiają do historii shella ani do gita). Każdy `secret put`
   tworzy nową wersję Workera, więc wykonywane PO pierwszym deployu.
4. **Weryfikacja runtime** — `curl` na URL produkcyjny: strona główna 200,
   `/auth/signin` 200, POST złych danych logowania → redirect 302 z
   `error=Invalid login credentials` (dowód, że produkcja rozmawia z Supabase).
   W razie problemów: `npx wrangler tail cashcheck` na żywo.
5. **Sekrety CI** — `gh secret set SUPABASE_URL` / `SUPABASE_KEY` w repo
   `bastii1996/cashcheck`, żeby workflow CI (astro sync + lint + build) miał
   komplet środowiska.
6. **Zapis wyniku** — aktualizacja tego pliku (status: executed, URL, wersja)
   i commit + push.

## Ręczne bramki (człowiek)

- ✅ `npx wrangler login` — wykonane przed planem (konto zweryfikowane przez `whoami`).
- Zatwierdzenie tego planu przed jakimkolwiek `wrangler deploy`.

## Znane ryzyka tego wdrożenia

- **Brak bindingu KV `SESSION` i bindingu `IMAGES` w wrangler.jsonc** — adapter
  loguje ich włączenie na buildzie, ale aplikacja nie używa Astro Sessions
  (auth idzie cookies przez @supabase/ssr) ani serwisu obrazów w runtime.
  Oczekiwanie: deploy przejdzie bez nich; jeśli nie — utworzyć namespace KV
  (`npx wrangler kv namespace create SESSION`) i dopisać binding, po czym powtórzyć krok 2.
- **Rollback**: `npx wrangler rollback [VERSION_ID]` — dotyczy tylko kodu;
  brak migracji DB na tym etapie, więc bez dodatkowych warunków.
- **Klucz publishable Supabase w sekretach Workera** — zgodnie z projektem
  bezpieczeństwo danych egzekwuje RLS, nie tajność klucza; mimo to trzymamy go
  jako secret (nie plaintext var), spójnie z AGENTS.md.

## Poza zakresem tego planu

- Auto-deploy z CI (obecny workflow robi lint+build; krok deploy dojdzie później).
- Custom domain, preview environments per-branch, migracje bazy.

## Wynik wykonania (2026-09-02)

- Build zweryfikowany: `dist/server/entry.mjs` + chunks, `dist/client/_astro`, 3,5 MB łącznie.
- Deploy: **https://cashcheck.sebastian-sobiech.workers.dev**, Version ID `512cd98e-cac7-4b8e-8556-3ad111443a6b`.
- Ryzyko bindingów rozwiązane automatycznie: wrangler zaprowizjonował KV namespace
  `cashcheck-session` (id `748718c1425945ae89575bc6a2b36c58`) jako binding `SESSION`;
  `IMAGES` i `ASSETS` podpięte bez dodatkowej konfiguracji.
- Sekrety Workera: `SUPABASE_URL`, `SUPABASE_KEY` (secret_text) — potwierdzone `wrangler secret list`.
- Weryfikacja runtime: `GET /` 200, `GET /auth/signin` 200, POST złych danych logowania →
  302 `error=Invalid login credentials` (produkcja rozmawia z Supabase).
- Sekrety CI ustawione w repo `bastii1996/cashcheck`: `SUPABASE_URL`, `SUPABASE_KEY`.
- Rollback w razie potrzeby: `npx wrangler rollback` (lista wersji: `npx wrangler versions list`).
