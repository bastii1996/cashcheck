// Shared current-month expenses query — single source for the SSR page and the
// CSV export (fix-month-window lesson: one source of truth for the window).
// Pure module apart from the injected Supabase client.
import type { SupabaseClient } from "@supabase/supabase-js";
import { currentMonthWindow } from "@/lib/services/expense-month";

export function selectCurrentMonthExpenses(supabase: SupabaseClient) {
  const { monthStart, nextMonthStart } = currentMonthWindow();
  return supabase
    .from("expenses")
    .select("*")
    .gte("expense_date", monthStart)
    .lt("expense_date", nextMonthStart)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
}
