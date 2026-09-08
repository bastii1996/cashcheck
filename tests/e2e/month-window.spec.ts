// Pochodzenie: m3l5 (debugging-as-test). Bug: okno miesiąca istnieje tylko w SSR
// (expenses.astro), więc wydatek zapisany z UI z datą spoza bieżącego miesiąca
// pojawia się na liście „TEN MIESIĄC" i zawyża podsumowanie (FR-007) aż do
// przeładowania strony. Ten test był NAJPIERW czerwony (reprodukcja), fix czyni
// go zielonym i zostaje jako regresja. Wzorowany na seed.spec.ts.
import { test, expect } from "@playwright/test";
import { waitForIslandsHydrated } from "./hydration";

/** Today's calendar date in Europe/Warsaw — matches the app's month window. */
function todayInWarsaw(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
}

/** 15th of the previous month (always outside the current-month window). */
function fifteenthOfPreviousMonth(): string {
  const [year, month] = todayInWarsaw().split("-").map(Number);
  return new Date(Date.UTC(year, month - 2, 15)).toISOString().slice(0, 10);
}

test("wydatek zapisany z datą z poprzedniego miesiąca nie figuruje w widoku TEN MIESIĄC (FR-007)", async ({
  page,
  baseURL,
}) => {
  const description = `Miesiąc E2E ${Date.now()}`;

  await page.goto("/expenses");
  await waitForIslandsHydrated(page);

  // Przez UI (ścieżka błędu): propozycja → korekta daty na poprzedni miesiąc → zapis.
  await page.getByLabel("Opisz wydatek jednym zdaniem").fill("rachunek sprzed miesiąca");
  await page.getByRole("button", { name: "Dodaj" }).click();
  await expect(page.getByRole("heading", { name: "Propozycja — sprawdź i zapisz" })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Kwota (zł)").fill("21,37");
  await page.getByLabel("Kategoria").selectOption("Rachunki");
  await page.getByLabel("Data").fill(fifteenthOfPreviousMonth());
  await page.getByLabel("Opis", { exact: true }).fill(description);

  // Id zapisanego wiersza łapiemy z odpowiedzi API — czyszczenie nie może iść
  // przez UI, bo poprawny widok ma tego wiersza nie pokazywać.
  const saveResponse = page.waitForResponse(
    (r) => r.url().endsWith("/api/expenses") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Zapisz wydatek" }).click();
  const saved = (await (await saveResponse).json()) as { id: string };

  // Kontrakt FR-007: widok i podsumowanie dotyczą bieżącego miesiąca — wydatek
  // z poprzedniego miesiąca nie ma prawa się w nich pojawić.
  await expect(page.getByRole("heading", { name: "Propozycja — sprawdź i zapisz" })).toBeHidden();
  await expect(page.getByRole("listitem").filter({ hasText: description })).toBeHidden();
  await expect(page.getByRole("row").filter({ hasText: "Rachunki" })).toBeHidden();

  // Czyszczenie przez API (wiersz jest niewidoczny w UI zgodnie z kontraktem).
  const deleted = await page.request.delete(`/api/expenses/${saved.id}`, {
    headers: { Origin: baseURL ?? "http://localhost:4321" },
  });
  expect(deleted.status()).toBe(204);
});
