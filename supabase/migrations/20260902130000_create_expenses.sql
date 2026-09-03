-- CashCheck S-01: expenses table with per-user row isolation.
-- Every row belongs to exactly one auth user; RLS enforces the PRD privacy
-- guardrail (a user may only ever read/write their own rows).

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  category text not null check (
    category in ('Żywność', 'Transport', 'Mieszkanie', 'Rachunki', 'Zdrowie', 'Rozrywka', 'Odzież', 'Inne')
  ),
  expense_date date not null default current_date,
  description text not null,
  created_at timestamptz not null default now()
);

create index expenses_user_id_expense_date_idx
  on public.expenses (user_id, expense_date desc);

alter table public.expenses enable row level security;

-- Granular per-operation policies, authenticated role only (no anon access).

create policy "expenses_select_own"
  on public.expenses for select
  to authenticated
  using (auth.uid() = user_id);

create policy "expenses_insert_own"
  on public.expenses for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "expenses_update_own"
  on public.expenses for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "expenses_delete_own"
  on public.expenses for delete
  to authenticated
  using (auth.uid() = user_id);
