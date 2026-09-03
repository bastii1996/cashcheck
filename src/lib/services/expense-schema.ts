import { z } from "zod";
import { todayInWarsaw } from "@/lib/services/expense-parser";
import { EXPENSE_CATEGORIES } from "@/types";

// Real calendar date (rejects 2026-13-45) inside the same sanity window the
// parser applies: yesterday-relative entries up to a year back, tomorrow max.
export function isPlausibleExpenseDate(value: string): boolean {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) {
    return false;
  }
  const diffDays = (Date.parse(todayInWarsaw()) - parsed) / 86_400_000;
  return diffDays >= -1 && diffDays <= 366;
}

/** Shared payload schema for creating (POST) and updating (PATCH) an expense. */
export const expensePayloadSchema = z.object({
  amount: z.number().positive().max(100_000),
  category: z.enum(EXPENSE_CATEGORIES),
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(isPlausibleExpenseDate, { message: "expense_date must be a real date within the last year" }),
  description: z.string().trim().min(1).max(300),
});

export const expenseIdSchema = z.uuid();
