// Pochodzenie: test-plan §2 ryzyko #1 (kontrakt propozycji — „awaria modelu nie
// blokuje dodania wydatku") + PRD FR-003/US-01: AI proponuje, użytkownik
// decyduje. Warstwa jednostkowa chroni normalizację; ten test chroni
// przeglądarkową resztę ryzyka: pełny przepływ zdanie → propozycja → korekta →
// zapis → lista i podsumowanie miesiąca (stan liczony wyłącznie w renderowanym
// UI, FR-007). Celowo NIE asertujemy treści propozycji (jakość modelu — §7
// przestrzeń negatywna); asertujemy, że wartości SKORYGOWANE przez użytkownika
// docierają do bazy i wracają w UI. Wzorowany na seed.spec.ts.
// Założenie danych: konto smoke nie ma w bieżącym miesiącu wydatków „Odzież"
// spoza tego testu (test sprząta po sobie; po przerwanym runie usuń osierocone
// wiersze ręcznie).
import { test, expect } from "@playwright/test";

/** Today's calendar date in Europe/Warsaw — matches the app's month window. */
function todayInWarsaw(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
}

const pln = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

test("skorygowana propozycja zapisuje dokładnie wartości użytkownika i zasila podsumowanie (ryzyko #1)", async ({
  page,
}) => {
  const description = `Korekta E2E ${Date.now()}`;
  // Unikalna kwota per uruchomienie — kolizje sum przy równoległych runach odpadają.
  const amount = Math.round((10 + (Date.now() % 89_000) / 100) * 100) / 100;
  const formattedAmount = pln.format(amount);

  await page.goto("/expenses");

  // Krok 1: zdanie idzie do AI — celowo bełkot; propozycja może mieć braki
  // albo flagę błędu, ale karta korekty MUSI się pojawić (kontrakt ryzyka #1).
  await page.getByLabel("Opisz wydatek jednym zdaniem").fill("zzz bełkot bez kwoty i sensu");
  await page.getByRole("button", { name: "Dodaj" }).click();
  await expect(page.getByRole("heading", { name: "Propozycja — sprawdź i zapisz" })).toBeVisible({ timeout: 20_000 });

  // Krok 2: użytkownik koryguje KAŻDE pole — to jego wartości są kontraktem.
  await page.getByLabel("Kwota (zł)").fill(String(amount).replace(".", ","));
  await page.getByLabel("Kategoria").selectOption("Odzież");
  await page.getByLabel("Data").fill(todayInWarsaw());
  await page.getByLabel("Opis", { exact: true }).fill(description);
  await page.getByRole("button", { name: "Zapisz wydatek" }).click();

  // Krok 3: wiersz na liście niesie dokładnie skorygowane wartości.
  const row = page.getByRole("listitem").filter({ hasText: description });
  await expect(row).toBeVisible();
  await expect(row).toContainText(formattedAmount);
  await expect(row).toContainText("Odzież");

  // Krok 4: podsumowanie miesiąca (FR-007, stan tylko w UI) uwzględnia zapis.
  const summaryRow = page.getByRole("row").filter({ hasText: "Odzież" });
  await expect(summaryRow).toContainText(formattedAmount);

  // Czyszczenie: dwustopniowe usunięcie wiersza; podsumowanie gubi kategorię.
  const deleteButton = page.getByRole("button", { name: `Usuń wydatek ${description}` });
  await deleteButton.click();
  await deleteButton.click();
  await expect(row).toBeHidden();
  await expect(summaryRow).toBeHidden();
});
