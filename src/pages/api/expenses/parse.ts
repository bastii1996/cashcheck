import type { APIRoute } from "astro";
import { z } from "zod";
import { json } from "@/lib/http";
import { parseExpenseSentence } from "@/lib/services/expense-parser";

export const prerender = false;

const parseRequestSchema = z.object({
  sentence: z.string().trim().min(1).max(300),
});

export const POST: APIRoute = async (context) => {
  if (!context.locals.user) {
    return json(401, { error: "Unauthorized" });
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const parsed = parseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: "sentence must be a 1-300 character string" });
  }

  const proposal = await parseExpenseSentence(parsed.data.sentence);

  return json(200, proposal);
};
