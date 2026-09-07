// Pochodzenie: zmiana export-month-csv + test-plan §2 ryzyko #3 („nowa trasa
// sama trafi pod ochronę" — jawnie kwestionowane: middleware NIE chroni /api).
// Kontrakt: zalogowany dostaje plik CSV dla polskiego Excela; niezalogowany 401.
// GET jest poza checkOrigin Astro, więc nagłówek Origin jest zbędny.
import { test, expect, request as playwrightRequest } from "@playwright/test";

test("eksport CSV: zalogowany dostaje plik, niezalogowany odmowę 401 (ryzyko #3)", async ({ page, baseURL }) => {
  // Zalogowany (cookies ze storageState) — kontrakt pliku.
  const authorized = await page.request.get("/api/expenses/export.csv");
  expect(authorized.status()).toBe(200);
  expect(authorized.headers()["content-type"]).toContain("text/csv");
  expect(authorized.headers()["content-disposition"]).toMatch(/attachment; filename="wydatki-\d{4}-\d{2}\.csv"/);
  const body = await authorized.text();
  expect(body.startsWith("﻿Data;Kategoria;Opis;Kwota")).toBe(true);

  // Świeży kontekst bez sesji — odmowa zamiast treści. storageState jawnie
  // puste: samo newContext potrafi odziedziczyć stan projektu i udawać sesję.
  const anonymous = await playwrightRequest.newContext({
    baseURL: baseURL ?? "http://localhost:4321",
    storageState: { cookies: [], origins: [] },
  });
  const denied = await anonymous.get("/api/expenses/export.csv");
  expect(denied.status()).toBe(401);
  await anonymous.dispose();
});
