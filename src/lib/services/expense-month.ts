// Month-window rules for FR-007 ("Ten miesiąc"). Pure module — imported by the
// React island, so it must NOT touch `cloudflare:workers` or any server-only API.

/** Today's calendar date in Europe/Warsaw (server runs UTC, browsers run anywhere). */
export function todayInWarsaw(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
}

/** Current-month window [monthStart, nextMonthStart) as ISO dates. */
export function currentMonthWindow(today: string = todayInWarsaw()): {
  monthStart: string;
  nextMonthStart: string;
} {
  const monthStart = `${today.slice(0, 7)}-01`;
  const [year, month] = today.split("-").map(Number);
  const nextMonthStart = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { monthStart, nextMonthStart };
}

/** FR-007: does this expense_date belong to the current Warsaw month? ISO strings compare lexicographically. */
export function isInCurrentMonth(expenseDate: string, today: string = todayInWarsaw()): boolean {
  const { monthStart, nextMonthStart } = currentMonthWindow(today);
  return expenseDate >= monthStart && expenseDate < nextMonthStart;
}
