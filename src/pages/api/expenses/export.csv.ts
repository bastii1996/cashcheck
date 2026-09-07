import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { selectCurrentMonthExpenses } from "@/lib/services/expense-query";
import { toMonthCsv } from "@/lib/services/expense-csv";
import { todayInWarsaw } from "@/lib/services/expense-month";
import type { Expense } from "@/types";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  // Middleware does not gate /api routes (test-plan risk #3) — deny here.
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await selectCurrentMonthExpenses(supabase);
  if (error) {
    // eslint-disable-next-line no-console -- observability sink for wrangler tail
    console.error("expenses: csv export query failed", error);
    return new Response(JSON.stringify({ error: "Export failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const month = todayInWarsaw().slice(0, 7);
  return new Response(toMonthCsv(data as Expense[]), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wydatki-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
};
