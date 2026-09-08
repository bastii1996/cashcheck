import { expect, type Page } from "@playwright/test";

/**
 * Wait until every Astro island on the page is hydrated.
 * Astro marks a server-rendered island with `ssr=""` and removes that attribute
 * once React takes over. Interacting before that point fills the DOM without
 * ever reaching React state (a `fill` is silently lost and the submit button
 * stays disabled), so every test that drives the island must await this first.
 */
export async function waitForIslandsHydrated(page: Page): Promise<void> {
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}
