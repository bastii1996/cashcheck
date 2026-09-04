import { describe, expect, it } from "vitest";
import { EXPENSE_CATEGORIES } from "@/types";
import { env } from "cloudflare:workers";

describe("runner smoke", () => {
  it("resolves the @ alias and the cloudflare:workers stub", async () => {
    expect(EXPENSE_CATEGORIES).toHaveLength(8);
    await expect(env.AI.run("model", {})).rejects.toThrow("stub");
  });
});
