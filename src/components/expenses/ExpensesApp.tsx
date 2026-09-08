import React, { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { isInCurrentMonth, todayInWarsaw } from "@/lib/services/expense-month";
import {
  EXPENSE_CATEGORIES,
  type CreateExpenseCommand,
  type Expense,
  type ExpenseCategory,
  type ExpenseProposal,
} from "@/types";

interface Props {
  initialExpenses: Expense[];
}

interface ProposalDraft {
  amount: string;
  category: ExpenseCategory | "";
  expenseDate: string;
  description: string;
  parseError: boolean;
}

const plnFormatter = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });
const dateFormatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long" });

const inputClass =
  "border-ink-700 bg-ink-900 text-ink-100 placeholder-ink-500 focus:border-lime-accent/60 w-full rounded-md border px-3 py-2.5 transition-colors focus:outline-none";

function formatDay(isoDate: string): string {
  const parsed = Date.parse(`${isoDate}T00:00:00`);
  return Number.isNaN(parsed) ? isoDate : dateFormatter.format(new Date(parsed));
}

export default function ExpensesApp({ initialExpenses }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [sentence, setSentence] = useState("");
  const [busy, setBusy] = useState<"parse" | "save" | "update" | "delete" | null>(null);
  const [draft, setDraft] = useState<ProposalDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ProposalDraft | null>(null);
  const [deleteArmedId, setDeleteArmedId] = useState<string | null>(null);
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleParse(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sentence.trim() || busy) {
      return;
    }
    setBusy("parse");
    setError(null);
    try {
      const res = await fetch("/api/expenses/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: sentence.trim() }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const payload: unknown = await res.json();
      const proposal = payload as ExpenseProposal;
      setDraft({
        amount: proposal.amount === null ? "" : String(proposal.amount),
        category: proposal.category ?? "",
        expenseDate: proposal.expense_date,
        description: proposal.description,
        parseError: proposal.parse_error,
      });
    } catch (err) {
      // eslint-disable-next-line no-console -- swallowed errors hide debugging evidence (m3l5 / OWASP A10)
      console.error("expenses: parse request failed", err);
      setError("Nie udało się połączyć z serwerem — spróbuj ponownie.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSave(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!draft || busy) {
      return;
    }
    const amount = Number.parseFloat(draft.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || !draft.category || !draft.expenseDate) {
      setError("Uzupełnij podświetlone pola przed zapisem.");
      return;
    }
    setBusy("save");
    setError(null);
    const command: CreateExpenseCommand = {
      amount: Math.round(amount * 100) / 100,
      category: draft.category,
      expense_date: draft.expenseDate,
      description: draft.description.trim() || sentence.trim(),
    };
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      if (res.status !== 201) {
        throw new Error(`HTTP ${res.status}`);
      }
      // Lessons rule: update the list from the response in hand, never re-read.
      const payload: unknown = await res.json();
      const saved = payload as Expense;
      setExpenses((prev) => [saved, ...prev]);
      setDraft(null);
      setSentence("");
    } catch (err) {
      // eslint-disable-next-line no-console -- swallowed errors hide debugging evidence (m3l5 / OWASP A10)
      console.error("expenses: save failed", err);
      setError("Zapis nie powiódł się — spróbuj ponownie.");
    } finally {
      setBusy(null);
    }
  }

  function startEdit(expense: Expense) {
    setDeleteArmedId(null);
    setEditingId(expense.id);
    setEditDraft({
      amount: String(expense.amount),
      category: expense.category,
      expenseDate: expense.expense_date,
      description: expense.description,
      parseError: false,
    });
  }

  async function handleUpdate(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId || !editDraft || busy) {
      return;
    }
    const amount = Number.parseFloat(editDraft.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0 || !editDraft.category || !editDraft.expenseDate) {
      setError("Uzupełnij poprawnie pola edytowanego wydatku.");
      return;
    }
    setBusy("update");
    setError(null);
    const command: CreateExpenseCommand = {
      amount: Math.round(amount * 100) / 100,
      category: editDraft.category,
      expense_date: editDraft.expenseDate,
      description: editDraft.description.trim(),
    };
    try {
      const res = await fetch(`/api/expenses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      if (res.status !== 200) {
        throw new Error(`HTTP ${res.status}`);
      }
      // Lessons rule: update the list from the response in hand, never re-read.
      const payload: unknown = await res.json();
      const updated = payload as Expense;
      setExpenses((prev) =>
        prev
          .map((row) => (row.id === updated.id ? updated : row))
          .sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at)),
      );
      setEditingId(null);
      setEditDraft(null);
    } catch (err) {
      // eslint-disable-next-line no-console -- swallowed errors hide debugging evidence (m3l5 / OWASP A10)
      console.error("expenses: update failed", err);
      setError("Aktualizacja nie powiodła się — spróbuj ponownie.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id: string) {
    if (busy) {
      return;
    }
    if (deleteArmedId !== id) {
      // First tap arms the button; it disarms itself after 3 s (FR-006 guard).
      setDeleteArmedId(id);
      if (disarmTimer.current) {
        clearTimeout(disarmTimer.current);
      }
      disarmTimer.current = setTimeout(() => {
        setDeleteArmedId(null);
      }, 3000);
      return;
    }
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.status !== 204) {
        throw new Error(`HTTP ${res.status}`);
      }
      setExpenses((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      // eslint-disable-next-line no-console -- swallowed errors hide debugging evidence (m3l5 / OWASP A10)
      console.error("expenses: delete failed", err);
      setError("Usunięcie nie powiodło się — spróbuj ponownie.");
    } finally {
      setDeleteArmedId(null);
      setBusy(null);
    }
  }

  // FR-007: the view is "this month" — state may hold rows saved/edited into
  // another month (legal data, wrong bucket); they must not render or count.
  const visibleExpenses = useMemo(() => expenses.filter((e) => isInCurrentMonth(e.expense_date)), [expenses]);

  // FR-007: month summary derived live from list state — grosze summed as
  // integer cents so 0.1 + 0.2 artifacts never reach the UI.
  const summary = useMemo(() => {
    const cents = new Map<ExpenseCategory, number>();
    for (const expense of visibleExpenses) {
      cents.set(expense.category, (cents.get(expense.category) ?? 0) + Math.round(expense.amount * 100));
    }
    const rows = [...cents.entries()]
      .map(([category, total]) => ({ category, total: total / 100 }))
      .sort((a, b) => b.total - a.total);
    return { rows, grandTotal: rows.reduce((sum, r) => sum + r.total, 0) };
  }, [visibleExpenses]);

  const amountMissing = draft !== null && draft.amount.trim() === "";
  const categoryMissing = draft !== null && draft.category === "";
  // Hero context: the month total means little without "how fast am I spending".
  const dayOfMonth = Number(todayInWarsaw().slice(8, 10));
  const dailyAverage = summary.grandTotal / Math.max(dayOfMonth, 1);
  const maxCategoryTotal = summary.rows.reduce((max, row) => Math.max(max, row.total), 0);
  const topCategoryName = summary.rows.length > 0 ? summary.rows[0].category : "—";

  return (
    <div className="flex w-full flex-col gap-10">
      {/* Hero: the month total is the loudest thing on screen; the rest is context. */}
      <section className="border-ink-800 grid gap-x-12 gap-y-6 border-b pb-8 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-end">
        <div>
          <p className="text-ink-400 text-xs font-semibold tracking-[0.18em] uppercase">Wydatki w tym miesiącu</p>
          <p className="amount text-lime-accent mt-2 text-5xl leading-none font-bold sm:text-6xl">
            {plnFormatter.format(summary.grandTotal)}
          </p>
        </div>
        <dl className="lg:border-ink-800 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:border-l lg:pl-12">
          <div>
            <dt className="text-ink-500 text-xs tracking-wide uppercase">Wpisów</dt>
            <dd className="amount text-ink-100 mt-1 text-2xl font-semibold">{visibleExpenses.length}</dd>
          </div>
          <div>
            <dt className="text-ink-500 text-xs tracking-wide uppercase">Średnio na dzień</dt>
            <dd className="amount text-ink-100 mt-1 text-2xl font-semibold">{plnFormatter.format(dailyAverage)}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-ink-500 text-xs tracking-wide uppercase">Najwięcej na</dt>
            <dd className="text-ink-100 mt-1 truncate text-2xl font-semibold">{topCategoryName}</dd>
          </div>
        </dl>
      </section>

      {/* Entry stays the fastest thing here (design principle 4). */}
      <section className="flex flex-col gap-4">
        <form onSubmit={handleParse} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="sentence" className="sr-only">
            Opisz wydatek jednym zdaniem
          </label>
          <input
            id="sentence"
            type="text"
            value={sentence}
            onChange={(e) => {
              setSentence(e.target.value);
            }}
            placeholder={'np. "biedronka 87,50" albo "paliwo 200 zł wczoraj"'}
            maxLength={300}
            autoFocus
            className={cn(inputClass, "flex-1 py-3.5 text-base")}
          />
          <button
            type="submit"
            disabled={busy !== null || !sentence.trim()}
            className="bg-lime-accent text-lime-ink hover:bg-lime-strong rounded-md px-7 py-3.5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "parse" ? "Analizuję…" : "Dodaj"}
          </button>
        </form>

        {draft && (
          <form
            onSubmit={handleSave}
            className="border-lime-accent/30 bg-ink-900 flex flex-col gap-4 rounded-lg border p-5"
          >
            <h2 className="font-display text-ink-100 text-lg font-semibold">Propozycja — sprawdź i zapisz</h2>
            {draft.parseError && (
              <p className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                Nie udało się przetworzyć zdania — uzupełnij pola ręcznie.
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[10rem_12rem_10rem_1fr]">
              <label className="text-ink-400 flex flex-col gap-1.5 text-xs tracking-wide uppercase">
                Kwota (zł)
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft.amount}
                  onChange={(e) => {
                    setDraft({ ...draft, amount: e.target.value });
                  }}
                  placeholder="0,00"
                  className={cn(inputClass, "amount", amountMissing && "border-alert ring-alert/40 ring-1")}
                />
              </label>
              <label className="text-ink-400 flex flex-col gap-1.5 text-xs tracking-wide uppercase">
                Kategoria
                <select
                  value={draft.category}
                  onChange={(e) => {
                    setDraft({ ...draft, category: e.target.value as ExpenseCategory | "" });
                  }}
                  className={cn(
                    inputClass,
                    "[&>option]:bg-ink-900 [&>option]:text-ink-100 appearance-none",
                    categoryMissing && "border-alert ring-alert/40 ring-1",
                  )}
                >
                  <option value="" disabled>
                    Wybierz…
                  </option>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-ink-400 flex flex-col gap-1.5 text-xs tracking-wide uppercase">
                Data
                <input
                  type="date"
                  value={draft.expenseDate}
                  onChange={(e) => {
                    setDraft({ ...draft, expenseDate: e.target.value });
                  }}
                  className={cn(inputClass, "[color-scheme:dark]")}
                />
              </label>
              <label className="text-ink-400 flex flex-col gap-1.5 text-xs tracking-wide uppercase">
                Opis
                <input
                  type="text"
                  value={draft.description}
                  maxLength={300}
                  onChange={(e) => {
                    setDraft({ ...draft, description: e.target.value });
                  }}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy !== null}
                className="bg-lime-accent text-lime-ink hover:bg-lime-strong rounded-md px-6 py-2.5 font-semibold transition-colors disabled:opacity-40"
              >
                {busy === "save" ? "Zapisuję…" : "Zapisz wydatek"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setDraft(null);
                  setError(null);
                }}
                className="text-ink-400 hover:text-ink-100 rounded-md px-4 py-2.5 text-sm transition-colors"
              >
                Odrzuć
              </button>
            </div>
          </form>
        )}

        {error && (
          <p role="alert" className="border-alert/40 bg-alert/10 rounded-md border px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
      </section>

      {/* Dense two-column body: the ledger earns the width, breakdown sits beside it. */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        <section className="flex flex-col gap-3">
          <div className="border-ink-800 flex items-baseline justify-between border-b pb-2">
            <h2 className="text-ink-400 text-xs font-semibold tracking-[0.18em] uppercase">Ten miesiąc</h2>
            <span className="amount text-ink-500 text-xs">{visibleExpenses.length} poz.</span>
          </div>
          {visibleExpenses.length === 0 ? (
            <div className="py-14 text-center">
              <p className="font-display text-ink-300 text-lg">Miesiąc jeszcze pusty</p>
              <p className="text-ink-500 mt-1.5 text-sm">
                {'Napisz wyżej „biedronka 87,50" — kwotę, kategorię i datę podpowie AI.'}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {visibleExpenses.map((expense) =>
                editingId === expense.id && editDraft ? (
                  <li key={expense.id} className="border-ink-800 bg-ink-900 border-b px-3 py-4">
                    <form onSubmit={handleUpdate} className="flex flex-col gap-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[9rem_11rem_9rem_1fr]">
                        <label className="text-ink-400 flex flex-col gap-1.5 text-xs tracking-wide uppercase">
                          Kwota (zł)
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editDraft.amount}
                            onChange={(e) => {
                              setEditDraft({ ...editDraft, amount: e.target.value });
                            }}
                            className={cn(inputClass, "amount")}
                          />
                        </label>
                        <label className="text-ink-400 flex flex-col gap-1.5 text-xs tracking-wide uppercase">
                          Kategoria
                          <select
                            value={editDraft.category}
                            onChange={(e) => {
                              setEditDraft({ ...editDraft, category: e.target.value as ExpenseCategory });
                            }}
                            className={cn(inputClass, "[&>option]:bg-ink-900 [&>option]:text-ink-100 appearance-none")}
                          >
                            {EXPENSE_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-ink-400 flex flex-col gap-1.5 text-xs tracking-wide uppercase">
                          Data
                          <input
                            type="date"
                            value={editDraft.expenseDate}
                            onChange={(e) => {
                              setEditDraft({ ...editDraft, expenseDate: e.target.value });
                            }}
                            className={cn(inputClass, "[color-scheme:dark]")}
                          />
                        </label>
                        <label className="text-ink-400 flex flex-col gap-1.5 text-xs tracking-wide uppercase">
                          Opis
                          <input
                            type="text"
                            value={editDraft.description}
                            maxLength={300}
                            onChange={(e) => {
                              setEditDraft({ ...editDraft, description: e.target.value });
                            }}
                            className={inputClass}
                          />
                        </label>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={busy !== null}
                          className="bg-lime-accent text-lime-ink hover:bg-lime-strong rounded-md px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-40"
                        >
                          {busy === "update" ? "Zapisuję…" : "Zapisz zmiany"}
                        </button>
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => {
                            setEditingId(null);
                            setEditDraft(null);
                          }}
                          className="text-ink-400 hover:text-ink-100 rounded-md px-3 py-2 text-sm transition-colors"
                        >
                          Anuluj
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li
                    key={expense.id}
                    className="group border-ink-800 hover:bg-ink-900 grid grid-cols-[1fr_auto] items-center gap-4 border-b px-3 py-3.5 transition-colors sm:grid-cols-[5.5rem_1fr_8rem_auto] sm:gap-6"
                  >
                    <span className="amount text-ink-500 hidden text-sm sm:block">
                      {formatDay(expense.expense_date)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-ink-100 truncate font-medium">{expense.description}</p>
                      <p className="text-ink-500 mt-0.5 text-xs">
                        <span className="sm:hidden">{formatDay(expense.expense_date)} · </span>
                        {expense.category}
                      </p>
                    </div>
                    <p className="amount text-ink-100 text-right text-lg font-semibold whitespace-nowrap">
                      {plnFormatter.format(expense.amount)}
                    </p>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-sm:col-span-2 max-sm:justify-end max-sm:opacity-100">
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => {
                          startEdit(expense);
                        }}
                        aria-label={`Edytuj wydatek ${expense.description}`}
                        className="text-ink-300 hover:bg-ink-850 hover:text-ink-100 rounded px-2 py-1 text-xs transition-colors"
                      >
                        Edytuj
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => {
                          void handleDelete(expense.id);
                        }}
                        aria-label={`Usuń wydatek ${expense.description}`}
                        className={cn(
                          "rounded px-2 py-1 text-xs transition-colors",
                          deleteArmedId === expense.id
                            ? "bg-alert/20 font-semibold text-red-200"
                            : "text-ink-300 hover:bg-ink-850 hover:text-ink-100",
                        )}
                      >
                        {deleteArmedId === expense.id ? "Na pewno?" : "Usuń"}
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}
        </section>

        {visibleExpenses.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="border-ink-800 text-ink-400 border-b pb-2 text-xs font-semibold tracking-[0.18em] uppercase">
              Ten miesiąc wg kategorii
            </h2>
            <table className="w-full">
              <tbody>
                {summary.rows.map((row) => (
                  <tr key={row.category} className="border-ink-800/60 border-b">
                    <td className="py-2.5 pr-3 align-middle">
                      <span className="text-ink-300 text-sm">{row.category}</span>
                      {/* Share bar: proportion of the biggest category, read at a glance. */}
                      <span className="bg-ink-850 mt-1.5 block h-[3px] w-full">
                        <span
                          className="bg-lime-accent/70 block h-full"
                          style={{
                            width: `${String(maxCategoryTotal > 0 ? (row.total / maxCategoryTotal) * 100 : 0)}%`,
                          }}
                        />
                      </span>
                    </td>
                    <td className="amount text-ink-100 py-2.5 text-right align-top text-sm font-medium whitespace-nowrap">
                      {plnFormatter.format(row.total)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="text-ink-400 pt-3 text-xs font-semibold tracking-[0.18em] uppercase">Łącznie</td>
                  <td className="amount text-lime-accent pt-3 text-right text-lg font-bold whitespace-nowrap">
                    {plnFormatter.format(summary.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
