---
topic: Testowalność parsera wydatków i schematu walidacji pod Vitest
researcher: agent (sesja 2026-09-04)
change_id: test-foundation-unit
---

# Research — fundament testów jednostkowych

## Code References (kotwice)

- `src/lib/services/expense-parser.ts:1` — `import { env } from "cloudflare:workers"` na poziomie modułu. KAŻDY import z tego pliku (także samego `todayInWarsaw`) ciągnie specyfikator `cloudflare:workers`, którego Node/Vitest nie rozwiąże bez aliasu.
- `src/lib/services/expense-parser.ts:26` — `todayInWarsaw()` (eksport); `:45` `extractRawProposal`, `:63` `normalizeAmount`, `:76` `normalizeCategory`, `:84` `normalizeDate` — **nieeksportowane** funkcje czyste; `:103` `parseExpenseSentence` (eksport) — jedyna publiczna droga do logiki normalizacji.
- `src/lib/services/expense-schema.ts:2` — importuje `todayInWarsaw` z expense-parser → **transitywnie zatruty** specyfikatorem cloudflare:workers; testy schematu też potrzebują aliasu.
- `package.json` — brak vitest/jest w devDependencies (profil bazy testowej `none` potwierdzony); skrypty nie mają `test`.
- `worker-configuration.d.ts:13742` — `declare module 'cloudflare:workers'` — typy istnieją globalnie, więc stub testowy się typuje.

## Architecture Insights

1. **Alias zamiast refaktoru.** Vitest z `resolve.alias` mapującym `cloudflare:workers` → lokalny stub (`test/stubs/cloudflare-workers.ts` eksportujący `env` z podmienialnym `AI.run`) odblokowuje testy CAŁEGO łańcucha bez dotykania kodu produkcyjnego. Golden-testy przez publiczne `parseExpenseSentence` z zamockowanym `env.AI.run` testują extract+normalizację razem — lepsza wierność niż eksportowanie prywatnych funkcji (i zero zmian w produkcie).
2. **Konfiguracja**: zwykły `vitest.config.ts` (environment: node) z aliasami `@` → `./src` i stubem CF; bez `getViteConfig` z Astro — bootowanie configu Astro ciągnęłoby adapter Cloudflare (dokładnie to, czego unikamy). tsconfig już mapuje `@/*`, vitest potrzebuje własnego aliasu.
3. **Mockowanie per-test**: `vi.mock("cloudflare:workers")` w pliku testowym + import `env` ze stubu; test ustawia `env.AI.run = vi.fn().mockResolvedValue(...)` per przypadek (kształty: `{response: obiekt}`, `{response: "json-string"}`, `{response: "nie-json"}`, reject).
4. **Wyrocznia dat względnych**: rozwiązanie „wczoraj" robi MODEL (prompt z dzisiejszą datą — `expense-parser.ts:30-43`); kod tylko waliduje ISO + okno -1…366 dni względem Europe/Warsaw (`:84-95`). Testy okna dat nie wymagają modelu — golden podaje gotowe `expense_date` w odpowiedzi mocka.

## Potencjalna luka (kandydat red→green)

`extractRawProposal` (`expense-parser.ts:45-61`): nieparsowalny string w `response` → `return {}` w cichym catch → propozycja z samymi nullami i **`parse_error: false`**. Wyrocznia z test-planu (Risk Response #1: „awaria modelu daje pustą propozycję **z flagą błędu**") mówi inaczej — bełkot z modelu to awaria parsowania i UI powinno pokazać komunikat (dziś pokaże gołą pustą kartę bez wyjaśnienia). Test golden „model zwraca bełkot → parse_error: true" powinien być napisany wg wymagania i **obnaży tę lukę** (czerwony), po czym poprawka w kodzie go zazieleni. Klasyczny dowód, że wyrocznia z wymagań łapie to, czego lustro implementacji nigdy by nie złapało.

## Ryzyka wykonania

- Stub musi eksportować dokładnie to, co importuje produkt (`env`) — inaczej vitest rzuci na etapie resolve.
- `expense-schema` używa `todayInWarsaw()` w walidatorze — testy okna dat schematu muszą liczyć oczekiwania względem Europe/Warsaw (nie UTC), inaczej flake o północy.
- Nie podpinamy testów do CI w tej zmianie (faza 4 planu testów; granica lekcji m3l2).
