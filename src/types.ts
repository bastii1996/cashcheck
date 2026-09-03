// Shared entities and DTOs for CashCheck (AGENTS.md: shared types live here).

export const EXPENSE_CATEGORIES = [
  "Żywność",
  "Transport",
  "Mieszkanie",
  "Rachunki",
  "Zdrowie",
  "Rozrywka",
  "Odzież",
  "Inne",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Row shape of public.expenses (dates serialized as ISO strings). */
export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: ExpenseCategory;
  expense_date: string;
  description: string;
  created_at: string;
}

/**
 * AI-derived proposal returned by POST /api/expenses/parse.
 * Fields the parser could not extract are null; the user fills them in
 * before saving. parse_error marks a full parser failure (empty card).
 */
export interface ExpenseProposal {
  amount: number | null;
  category: ExpenseCategory | null;
  expense_date: string;
  description: string;
  parse_error: boolean;
}

/** Payload accepted by POST /api/expenses. user_id is never client-supplied. */
export interface CreateExpenseCommand {
  amount: number;
  category: ExpenseCategory;
  expense_date: string;
  description: string;
}
