// seed.spec.ts — egzemplarz, na którym wzorowany jest każdy generowany test E2E
// (test-plan §4, m3l4). Pokazuje cztery wzorce: lokatory oparte na rolach,
// niezależność testu (setup → akcja → asercja → czyszczenie w jednym teście),
// czekanie na stan (nigdy waitForTimeout) i nazwę związaną z ryzykiem.
// Granice realne: auth (storageState), routing, API, DB. Setup danych idzie
// przez API zamiast UI, żeby ominąć niedeterministyczne wywołanie Workers AI.
import { test, expect } from "@playwright/test";
import { waitForIslandsHydrated } from "./hydration";

/** Today's calendar date in Europe/Warsaw — matches the app's month window. */
function todayInWarsaw(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
}

test("zapisany wydatek przetrwa przeładowanie strony (SSR czyta z bazy)", async ({ page, baseURL }) => {
  const description = `Seed E2E ${Date.now()}`;

  // Setup: unikalny wydatek przez API (cookies ze storageState; Origin dla CSRF Astro).
  const created = await page.request.post("/api/expenses", {
    headers: { Origin: baseURL ?? "http://localhost:4321" },
    data: { amount: 11.5, category: "Inne", expense_date: todayInWarsaw(), description },
  });
  expect(created.status()).toBe(201);

  // Akcja + asercja: wiersz wydatku jest widoczny po pełnym renderze SSR i po
  // reloadzie. Lokator zawężony do listitem — w dev Astro serializuje propsy
  // wyspy do osobnego elementu, więc goły getByText łapałby dwa węzły.
  const row = page.getByRole("listitem").filter({ hasText: description });
  await page.goto("/expenses");
  await waitForIslandsHydrated(page);
  await expect(row).toBeVisible();
  await page.reload();
  await waitForIslandsHydrated(page);
  await expect(row).toBeVisible();

  // Czyszczenie przez UI: dwustopniowe usuwanie (Usuń → „Na pewno?", FR-006).
  const deleteButton = page.getByRole("button", { name: `Usuń wydatek ${description}` });
  await deleteButton.click();
  await deleteButton.click();
  await expect(row).toBeHidden();
});
