-- Migration: credit_cards table.
-- Idempotente — pode rodar várias vezes sem efeitos colaterais.
--
-- Cartão de crédito é um compromisso futuro, não saída de caixa imediata.
-- Compras com card_id NÃO somam no saldo do mês — aparecem em "Compromissos cartão".
-- Saída real acontece quando a fatura é paga (ver card_invoice_payments na 005).

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  last_digits text,
  color text,
  limit_amount numeric,                -- "limit" é palavra reservada em SQL
  closing_day int,                     -- dia padrão de fechamento (nullable — varia em vários cartões BR)
  due_day int not null,                -- dia de vencimento
  owner_type text not null default 'self', -- 'self' | 'third_party'
  owner_name text,                     -- nome do dono se third_party (ex: "Leonis Agripino")
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint credit_cards_owner_type_check
    check (owner_type in ('self', 'third_party')),
  constraint credit_cards_closing_day_range
    check (closing_day is null or (closing_day between 1 and 31)),
  constraint credit_cards_due_day_range
    check (due_day between 1 and 31)
);

create index if not exists credit_cards_user_idx
  on public.credit_cards (user_id, is_active);

-- Trigger updated_at
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists credit_cards_set_updated_at on public.credit_cards;
    create trigger credit_cards_set_updated_at
      before update on public.credit_cards
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- RLS
alter table public.credit_cards enable row level security;

drop policy if exists credit_cards_select_own on public.credit_cards;
drop policy if exists credit_cards_insert_own on public.credit_cards;
drop policy if exists credit_cards_update_own on public.credit_cards;
drop policy if exists credit_cards_delete_own on public.credit_cards;

create policy credit_cards_select_own on public.credit_cards
  for select using (user_id = auth.uid());

create policy credit_cards_insert_own on public.credit_cards
  for insert with check (user_id = auth.uid());

create policy credit_cards_update_own on public.credit_cards
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy credit_cards_delete_own on public.credit_cards
  for delete using (user_id = auth.uid());
