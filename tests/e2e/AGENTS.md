# E2E Testing Rules

Model every generated test on `seed.spec.ts` in this directory. Never generate an E2E test from scratch — start from a browser-level risk in `context/foundation/test-plan.md` and name the test after that risk.

- Use `getByRole`, `getByLabel`, `getByText` as primary locators. Fall back to `getByTestId` only when accessibility attributes are ambiguous. Never CSS selectors, XPath, or DOM structure.
- Each test must be independently runnable — own setup, action, assertion, cleanup; no shared state between tests.
- Never use `page.waitForTimeout()`. Wait for specific conditions: `toBeVisible()`, `waitForURL()`, `waitForResponse()`.
- Assert the business outcome, not implementation details. Control question: would this assertion fail if the test-plan risk materialized? If not, it is decorative.
- Use unique identifiers (timestamp suffix) for test data so parallel runs and re-runs never collide; clean up what you create.
- Authenticate through `storageState` (see `auth.setup.ts`) — never log in through UI in individual tests.
- Real vs mocked: internal boundaries (auth, routing, DB) stay real — that is where integration risk hides. Mock expensive or non-deterministic external APIs only. Workers AI is called **server-side**, so `page.route()` cannot intercept it — set up data through `/api/expenses` instead of driving the AI parse flow when the risk under test is not the parser itself.
- Budget: one test per risk, rarely more than 1–3 per change phase. Never a test per page or per button.
- Run a single spec with: `npx playwright test tests/e2e/<file>.spec.ts`
