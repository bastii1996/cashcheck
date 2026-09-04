import { test as setup } from "@playwright/test";

// One UI sign-in per run; every test reuses the saved storageState (E2E rule:
// never log in through UI in individual tests).
const AUTH_FILE = "tests/e2e/.auth/user.json";

setup("zaloguj konto smoke i zapisz storageState", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error("Ustaw E2E_EMAIL i E2E_PASSWORD w .env (zobacz .env.example).");
  }

  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/expenses");

  await page.context().storageState({ path: AUTH_FILE });
});
