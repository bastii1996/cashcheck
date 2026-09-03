import type { APIRoute } from "astro";
import { z } from "zod";
import { parseExpenseSentence } from "@/lib/services/expense-parser";

export const prerender = false;

const parseRequestSchema = z.object({
  sentence: z.string().trim().min(1).max(300),
});

export const POST: APIRoute = async (context) => {
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = parseRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "sentence must be a 1-300 character string" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const proposal = await parseExpenseSentence(parsed.data.sentence);

  return new Response(JSON.stringify(proposal), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
