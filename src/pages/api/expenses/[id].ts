import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { expenseIdSchema, expensePayloadSchema } from "@/lib/services/expense-schema";

export const prerender = false;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// RLS scopes every statement to auth.uid() = user_id, so touching someone
// else's id affects zero rows — surfaced uniformly as 404.

export const PATCH: APIRoute = async (context) => {
  if (!context.locals.user) {
    return json(401, { error: "Unauthorized" });
  }
  const id = expenseIdSchema.safeParse(context.params.id);
  if (!id.success) {
    return json(400, { error: "Invalid expense id" });
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

  const result = await supabase.from("expenses").update(parsed.data).eq("id", id.data).select().single();
  const data: unknown = result.data;
  if (result.error || data === null) {
    if (result.error && result.error.code !== "PGRST116") {
      // eslint-disable-next-line no-console -- observability sink for wrangler tail
      console.error("expenses: update failed", result.error);
      return json(500, { error: "Could not update the expense" });
    }
    return json(404, { error: "Expense not found" });
  }
  return json(200, data);
};

export const DELETE: APIRoute = async (context) => {
  if (!context.locals.user) {
    return json(401, { error: "Unauthorized" });
  }
  const id = expenseIdSchema.safeParse(context.params.id);
  if (!id.success) {
    return json(400, { error: "Invalid expense id" });
  }
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return json(500, { error: "Supabase is not configured" });
  }

  const result = await supabase.from("expenses").delete().eq("id", id.data).select();
  const rows: unknown = result.data;
  if (result.error) {
    // eslint-disable-next-line no-console -- observability sink for wrangler tail
    console.error("expenses: delete failed", result.error);
    return json(500, { error: "Could not delete the expense" });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return json(404, { error: "Expense not found" });
  }
  return new Response(null, { status: 204 });
};
