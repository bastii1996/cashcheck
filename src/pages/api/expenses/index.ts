import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { expensePayloadSchema } from "@/lib/services/expense-schema";

export const prerender = false;

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

  const parsed = expensePayloadSchema.safeParse(body);
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
