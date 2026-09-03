import React, { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
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
  "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-white placeholder-blue-100/40 focus:border-blue-300/60 focus:outline-none";

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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
      setError("Usunięcie nie powiodło się — spróbuj ponownie.");
    } finally {
      setDeleteArmedId(null);
      setBusy(null);
    }
  }

  // FR-007: month summary derived live from list state — grosze summed as
  // integer cents so 0.1 + 0.2 artifacts never reach the UI.
  const summary = useMemo(() => {
    const cents = new Map<ExpenseCategory, number>();
    for (const expense of expenses) {
      cents.set(expense.category, (cents.get(expense.category) ?? 0) + Math.round(expense.amount * 100));
    }
    const rows = [...cents.entries()]
      .map(([category, total]) => ({ category, total: total / 100 }))
      .sort((a, b) => b.total - a.total);
    return { rows, grandTotal: rows.reduce((sum, r) => sum + r.total, 0) };
  }, [expenses]);

  const amountMissing = draft !== null && draft.amount.trim() === "";
  const categoryMissing = draft !== null && draft.category === "";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
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
          placeholder='np. "biedronka 87,50" albo "paliwo 200 zł wczoraj"'
          maxLength={300}
          autoFocus
          className={cn(inputClass, "flex-1 text-base")}
        />
        <button
          type="submit"
          disabled={busy !== null || !sentence.trim()}
          className="rounded-lg bg-blue-500/80 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {busy === "parse" ? "Analizuję…" : "Dodaj"}
        </button>
      </form>

      {draft && (
        <form
          onSubmit={handleSave}
          className="flex flex-col gap-4 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl"
        >
          <h2 className="text-lg font-semibold">Propozycja — sprawdź i zapisz</h2>
          {draft.parseError && (
            <p className="rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
              Nie udało się przetworzyć zdania — uzupełnij pola ręcznie.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-blue-100/80">
              Kwota (zł)
              <input
                type="text"
                inputMode="decimal"
                value={draft.amount}
                onChange={(e) => {
                  setDraft({ ...draft, amount: e.target.value });
                }}
                placeholder="0,00"
                className={cn(inputClass, amountMissing && "border-red-400/70 ring-1 ring-red-400/50")}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-blue-100/80">
              Kategoria
              <select
                value={draft.category}
                onChange={(e) => {
                  setDraft({ ...draft, category: e.target.value as ExpenseCategory | "" });
                }}
                className={cn(
                  inputClass,
                  "appearance-none [&>option]:text-slate-900",
                  categoryMissing && "border-red-400/70 ring-1 ring-red-400/50",
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
            <label className="flex flex-col gap-1 text-sm text-blue-100/80">
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
          </div>
          <label className="flex flex-col gap-1 text-sm text-blue-100/80">
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
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy !== null}
              className="flex-1 rounded-lg bg-emerald-500/80 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
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
              className="rounded-lg border border-white/20 px-4 py-2.5 text-sm text-blue-100/80 transition-colors hover:bg-white/10"
            >
              Odrzuć
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}

      {expenses.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-blue-100/60 uppercase">Ten miesiąc wg kategorii</h2>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <table className="w-full text-sm">
              <tbody>
                {summary.rows.map((row) => (
                  <tr key={row.category} className="border-b border-white/5 last:border-0">
                    <td className="py-1.5 text-blue-100/80">{row.category}</td>
                    <td className="py-1.5 text-right font-medium text-white">{plnFormatter.format(row.total)}</td>
                  </tr>
                ))}
                <tr className="border-t border-white/20">
                  <td className="py-2 font-semibold tracking-wide text-blue-100/80 uppercase">Łącznie</td>
                  <td className="py-2 text-right text-base font-bold text-white">
                    {plnFormatter.format(summary.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-blue-100/60 uppercase">Ten miesiąc</h2>
        {expenses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-blue-100/50">
            Brak wydatków w tym miesiącu — dodaj pierwszy jednym zdaniem powyżej.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {expenses.map((expense) =>
              editingId === expense.id && editDraft ? (
                <li key={expense.id} className="rounded-xl border border-blue-300/30 bg-white/10 px-4 py-3">
                  <form onSubmit={handleUpdate} className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label className="flex flex-col gap-1 text-xs text-blue-100/70">
                        Kwota (zł)
                        <input
                          type="text"
                          inputMode="decimal"
                          value={editDraft.amount}
                          onChange={(e) => {
                            setEditDraft({ ...editDraft, amount: e.target.value });
                          }}
                          className={inputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-blue-100/70">
                        Kategoria
                        <select
                          value={editDraft.category}
                          onChange={(e) => {
                            setEditDraft({ ...editDraft, category: e.target.value as ExpenseCategory });
                          }}
                          className={cn(inputClass, "appearance-none [&>option]:text-slate-900")}
                        >
                          {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-blue-100/70">
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
                    </div>
                    <label className="flex flex-col gap-1 text-xs text-blue-100/70">
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
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={busy !== null}
                        className="flex-1 rounded-lg bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
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
                        className="rounded-lg border border-white/20 px-3 py-2 text-sm text-blue-100/80 transition-colors hover:bg-white/10"
                      >
                        Anuluj
                      </button>
                    </div>
                  </form>
                </li>
              ) : (
                <li
                  key={expense.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{expense.description}</p>
                    <p className="text-xs text-blue-100/50">
                      {formatDay(expense.expense_date)} · {expense.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold whitespace-nowrap text-white">
                      {plnFormatter.format(expense.amount)}
                    </p>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        startEdit(expense);
                      }}
                      aria-label={`Edytuj wydatek ${expense.description}`}
                      className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-blue-100/80 transition-colors hover:bg-white/10"
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
                        "rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                        deleteArmedId === expense.id
                          ? "border-red-400/70 bg-red-500/20 font-semibold text-red-100"
                          : "border-white/15 text-blue-100/80 hover:bg-white/10",
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
    </div>
  );
}
