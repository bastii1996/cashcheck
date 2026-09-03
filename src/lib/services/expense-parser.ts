import { env } from "cloudflare:workers";
import { EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseProposal } from "@/types";

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const PROPOSAL_JSON_SCHEMA = {
  type: "object",
  properties: {
    amount: { type: ["number", "null"], description: "Kwota wydatku w złotych, np. 87.5" },
    category: { type: ["string", "null"], enum: [...EXPENSE_CATEGORIES, null] },
    expense_date: {
      type: ["string", "null"],
      description: "Data wydatku w formacie YYYY-MM-DD lub null, gdy zdanie nie mówi o dacie",
    },
  },
  required: ["amount", "category", "expense_date"],
} as const;

interface RawProposal {
  amount?: unknown;
  category?: unknown;
  expense_date?: unknown;
}

/** Today's calendar date in Europe/Warsaw (workerd runs in UTC — see plan). */
export function todayInWarsaw(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
}

function buildSystemPrompt(today: string): string {
  return [
    "Zamieniasz jedno polskie zdanie o wydatku na strukturalny JSON.",
    `Dozwolone kategorie: ${EXPENSE_CATEGORIES.join(", ")}.`,
    `Dzisiejsza data: ${today}. Rozwiązuj daty względne („wczoraj", „przedwczoraj", „we wtorek") względem niej.`,
    "Gdy zdanie nie podaje kwoty, zwróć amount: null. Gdy nie da się dobrać kategorii, zwróć category: null.",
    "Gdy zdanie nie mówi o dacie, zwróć expense_date: null.",
    "Przykłady:",
    `„biedronka 87,50" -> {"amount": 87.5, "category": "Żywność", "expense_date": null}`,
    `„paliwo 200 zł wczoraj" -> {"amount": 200, "category": "Transport", "expense_date": "<wczorajsza data>"}`,
    `„czynsz" -> {"amount": null, "category": "Mieszkanie", "expense_date": null}`,
    `„apteka 34.99 w poniedziałek" -> {"amount": 34.99, "category": "Zdrowie", "expense_date": "<data poniedziałku>"}`,
  ].join("\n");
}

function extractRawProposal(result: unknown): RawProposal {
  if (result === null || typeof result !== "object" || !("response" in result)) {
    return {};
  }
  const response: unknown = result.response;
  if (typeof response === "string") {
    try {
      return JSON.parse(response) as RawProposal;
    } catch {
      return {};
    }
  }
  if (response !== null && typeof response === "object") {
    return response;
  }
  return {};
}

function normalizeAmount(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.round(raw * 100) / 100;
  }
  if (typeof raw === "string") {
    const parsed = Number.parseFloat(raw.replace(",", ".").replace(/[^\d.]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed * 100) / 100;
    }
  }
  return null;
}

function normalizeCategory(raw: unknown): ExpenseCategory | null {
  if (typeof raw !== "string") {
    return null;
  }
  const match = EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === raw.trim().toLowerCase());
  return match ?? null;
}

function normalizeDate(raw: unknown, today: string): string {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return today;
  }
  const candidate = raw.trim();
  // Sanity window: reject dates the model hallucinated far outside normal entry range.
  const diffDays = (Date.parse(today) - Date.parse(candidate)) / 86_400_000;
  if (!Number.isFinite(diffDays) || diffDays < -1 || diffDays > 366) {
    return today;
  }
  return candidate;
}

/**
 * Turns one natural-language sentence into an ExpenseProposal.
 * Never throws: a model/runtime failure returns an empty proposal with
 * parse_error: true so the UI degrades to a manual form (plan: parse failures
 * must not block adding an expense).
 */
export async function parseExpenseSentence(sentence: string): Promise<ExpenseProposal> {
  const today = todayInWarsaw();
  const base: ExpenseProposal = {
    amount: null,
    category: null,
    expense_date: today,
    description: sentence,
    parse_error: false,
  };

  try {
    const result: unknown = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: buildSystemPrompt(today) },
        { role: "user", content: sentence },
      ],
      response_format: { type: "json_schema", json_schema: PROPOSAL_JSON_SCHEMA },
    });

    const raw = extractRawProposal(result);

    return {
      ...base,
      amount: normalizeAmount(raw.amount),
      category: normalizeCategory(raw.category),
      expense_date: normalizeDate(raw.expense_date, today),
    };
  } catch (error) {
    // Surface the real error in wrangler tail — workerd 500s are opaque otherwise
    // (infrastructure.md risk register).
    // eslint-disable-next-line no-console -- deliberate observability sink for tail
    console.error("expense-parser: AI call failed", error);
    return { ...base, parse_error: true };
  }
}
