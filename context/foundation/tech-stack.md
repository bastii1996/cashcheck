---
starter_id: 10x-astro-starter
package_manager: npm
project_name: cashcheck
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers
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
---

## Why this stack

Solowy deweloper dostarcza w 2 tygodnie po godzinach MVP trackera wydatków z uwierzytelnianiem (FR-001) i klasyfikacją zdania na ustrukturyzowany wydatek przez LLM (FR-002/FR-003) — potrzebuje więc startera, który daje auth, bazę danych i wdrożenie out-of-the-box, bez czasu na składanie stosu ręcznie. 10x Astro Starter (Astro 6 + React 19 + TypeScript + Tailwind 4 + Supabase + Cloudflare) jest rekomendowanym domyślnym wyborem dla komórki (web-app, js), przechodzi wszystkie cztery bramki agent-friendly (typed, convention-based, popular, well-documented) i pokrywa się z zadeklarowaną wcześniej preferencją użytkownika (Astro + React + Supabase), więc ścieżka standardowa została przyjęta bez modyfikacji. Flagi funkcji: auth i AI włączone; płatności, realtime i zadania w tle poza zakresem zgodnie z Non-Goals PRD. Wdrożenie na Cloudflare Pages (domyślny cel startera), CI na GitHub Actions z auto-deployem po merge do main — kształt, z którym starter jest dostarczany. Uwaga z karty startera: RLS w Supabase trzeba skonfigurować od początku (guardrail prywatności w PRD tego wymaga), a edge runtime nie nadaje się do długich zadań — nieistotne dla tego zakresu.
