import type { APIRoute } from "astro";
import { z } from "zod";
import { createClient } from "@/lib/supabase";
import { EXPENSE_CATEGORIES } from "@/types";

export const prerender = false;

const createExpenseSchema = z.object({
  amount: z.number().positive().max(100_000),
  category: z.enum(EXPENSE_CATEGORIES),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(1).max(300),
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async (context) => {
  if (!context.locals.user) {
    return json(401, { error: "Unauthorized" });
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json(500, { error: "Supabase is not configured" });
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: "Invalid expense payload", issues: parsed.error.issues });
  }

  // user_id is intentionally absent: the column defaults to auth.uid() and RLS
  // with check (auth.uid() = user_id) enforces ownership at the database.
  const result = await supabase.from("expenses").insert(parsed.data).select().single();
  const data: unknown = result.data;
  const error = result.error;

  if (error) {
    // eslint-disable-next-line no-console -- observability sink for wrangler tail
    console.error("expenses: insert failed", error);
    return json(500, { error: "Could not save the expense" });
  }

  return json(201, data);
};
