---
bootstrapped_at: 2026-08-31T21:30:00Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: cashcheck
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

# Bootstrap verification — cashcheck

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: cashcheck
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: false
```

> **Why this stack** (z tech-stack.md): Solowy deweloper dostarcza w 2 tygodnie po godzinach MVP trackera wydatków z uwierzytelnianiem (FR-001) i klasyfikacją zdania na ustrukturyzowany wydatek przez LLM (FR-002/FR-003) — potrzebuje więc startera, który daje auth, bazę danych i wdrożenie out-of-the-box, bez czasu na składanie stosu ręcznie. 10x Astro Starter (Astro 6 + React 19 + TypeScript + Tailwind 4 + Supabase + Cloudflare) jest rekomendowanym domyślnym wyborem dla komórki (web-app, js), przechodzi wszystkie cztery bramki agent-friendly i pokrywa się z zadeklarowaną wcześniej preferencją użytkownika, więc ścieżka standardowa została przyjęta bez modyfikacji. Flagi funkcji: auth i AI włączone; płatności, realtime i zadania w tle poza zakresem zgodnie z Non-Goals PRD. Wdrożenie na Cloudflare Pages, CI na GitHub Actions z auto-deployem po merge do main. Uwaga z karty startera: RLS w Supabase trzeba skonfigurować od początku, a edge runtime nie nadaje się do długich zadań.

## Pre-scaffold verification

| Signal      | Value                                                    | Severity | Notes                                                      |
| ----------- | -------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| npm package | not run                                                  | n/a      | cmd_template zaczyna się od `git clone` — krok npm pominięty |
| GitHub repo | przeprogramowani/10x-astro-starter last pushed 2026-08-22 | fresh    | z card.docs_url; 9 dni przed uruchomieniem (`gh` niedostępne, użyto GitHub REST API) |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 18 pozycji najwyższego poziomu (w tym node_modules po instalacji; `.bootstrap-scaffold/.git/` usunięty przed przeniesieniem)
**Conflicts (.scaffold siblings)**: CLAUDE.md → CLAUDE.md.scaffold (wersja z cwd wygrała)
**.gitignore handling**: moved silently (brak .gitignore w cwd)
**.bootstrap-scaffold cleanup**: deleted

`context/` w cwd zachowany w całości (starter nie zawierał katalogu context/). Instalacja: 773 pakiety, npm install w ~2 min.

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 1 CRITICAL, 13 HIGH, 7 MODERATE, 2 LOW
**Direct vs transitive**: 3 pakiety bezpośrednie dotknięte (astro HIGH, supabase MODERATE, wrangler MODERATE); pozostałe 20 przechodnie. Wszystkie 23 mają fix dostępny przez `npm audit fix` (bez zmian semver-major).

#### CRITICAL findings

- **tar** ≤7.5.20 (przechodnia, przez supabase) — file smuggling przez PAX size override w nagłówkach GNU long-name (GHSA-vmf3-w455-68vh); crash procesu przez PAX numeric path type confusion (GHSA-w8wr-v893-vjvp). Fix: `npm audit fix`.

#### HIGH findings

- **astro** ≤7.0.9 (bezpośrednia) — XSS przez nieescapowane nazwy atrybutów w spread props (GHSA-jrpj-wcv7-9fh9, GHSA-f48w-9m4c-m7f5). Fix: `npm audit fix`.
- **brace-expansion** — DoS przez wykładniczą ekspansję (GHSA-3jxr-9vmj-r5cp).
- **devalue** 5.6.3–5.8.0 — DoS przez deserializację sparse array (GHSA-77vg-94rm-hx3p).
- **fast-uri** — host confusion przez backslash w authority (GHSA-v2hh-gcrm-f6hx).
- **js-yaml** 4.x — kwadratowy DoS w merge keys (GHSA-h67p-54hq-rp68).
- **miniflare** — przechodnia przez sharp/undici/ws.
- **nanoid** ≤3.3.17 — nieskończona pętla generatorów (GHSA-28wg-ghj8-5hjv).
- **postcss** ≤8.5.22 — path traversal przez sourceMappingURL (GHSA-fxqj-rqcc-2cmp).
- **sharp** <0.35.0 — odziedziczone CVE libvips (GHSA-f88m-g3jw-g9cj).
- **svgo** 4.0.0–4.0.1 — removeScripts zostawia wykonywalne skrypty (GHSA-2p49-hgcm-8545).
- **undici** 7.x — bypass walidacji TLS w SOCKS5 ProxyAgent (GHSA-vmh5-mc38-953g).
- **vite** 7.0.0–7.3.3 — ujawnienie hashy NTLMv2 przez UNC na Windows (GHSA-v6wh-96g9-6wx3); bypass `server.fs.deny` na Windows (GHSA-fx2h-pf6j-xcff).
- **ws** 8.0.0–8.20.1 — ujawnienie niezainicjalizowanej pamięci (GHSA-58qx-3vcg-4xpx).

Wszystkie HIGH: fix przez `npm audit fix`.

#### MODERATE findings

@astrojs/language-server, @cloudflare/vite-plugin, supabase (przez tar), volar-service-yaml, wrangler (przez esbuild/miniflare), yaml (stack overflow przy głębokim zagnieżdżeniu, GHSA-48c2-rrv3-qjmp), yaml-language-server — wszystkie przechodnie lub narzędziowe; fix przez `npm audit fix`.

#### LOW / INFO findings

@babel/core ≤7.29.0 (arbitrary file read przez sourceMappingURL, GHSA-4x5r-pxfx-6jf8), esbuild 0.27.3–0.28.0 (arbitrary file read w dev serwerze na Windows, GHSA-g7r4-m6w7-qqqr). Fix przez `npm audit fix`.

## Hints recorded but not acted on

| Hint                    | Value               |
| ----------------------- | ------------------- |
| bootstrapper_confidence | first-class         |
| quality_override        | false               |
| path_taken              | standard            |
| self_check_answers      | null                |
| team_size               | solo                |
| deployment_target       | cloudflare-pages    |
| ci_provider             | github-actions      |
| ci_default_flow         | auto-deploy-on-merge|
| has_auth                | true                |
| has_payments            | false               |
| has_realtime            | false               |
| has_ai                  | true                |
| has_background_jobs     | false               |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep (here: `CLAUDE.md.scaffold`).
- Address audit findings per your project's risk tolerance — the full breakdown is in this log. All 23 findings are fixable via `npm audit fix` (no semver-major bumps).
