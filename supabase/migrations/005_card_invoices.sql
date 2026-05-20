-- Migration: card_invoices + card_invoice_payments.
-- Idempotente — pode rodar várias vezes sem efeitos colaterais.
--
-- Fatura é o agrupador das compras de um cartão num ciclo de fechamento.
-- Pagamento da fatura é uma lista (suporta pagamento parcial / split).
-- Fatura fica "paid" quando sum(payments.amount) >= total.

create table if not exists public.card_invoices (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  reference_month text not null,        -- 'YYYY-MM'
  closing_date date not null,
  due_date date not null,
  total numeric not null default 0,     -- soma das compras (calculado/cached)
  status text not null default 'open',  -- 'open' | 'closed' | 'paid'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (card_id, reference_month),
  constraint card_invoices_status_check
    check (status in ('open', 'closed', 'paid'))
);

create index if not exists card_invoices_card_idx
  on public.card_invoices (card_id, reference_month desc);

create index if not exists card_invoices_status_idx
  on public.card_invoices (card_id, status);

-- Trigger updated_at
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists card_invoices_set_updated_at on public.card_invoices;
    create trigger card_invoices_set_updated_at
      before update on public.card_invoices
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- RLS — só dono do cartão acessa
alter table public.card_invoices enable row level security;

drop policy if exists card_invoices_select_own on public.card_invoices;
drop policy if exists card_invoices_insert_own on public.card_invoices;
drop policy if exists card_invoices_update_own on public.card_invoices;
drop policy if exists card_invoices_delete_own on public.card_invoices;

create policy card_invoices_select_own on public.card_invoices
  for select using (
    exists (
      select 1 from public.credit_cards c
      where c.id = card_invoices.card_id and c.user_id = auth.uid()
    )
  );

create policy card_invoices_insert_own on public.card_invoices
  for insert with check (
    exists (
      select 1 from public.credit_cards c
      where c.id = card_invoices.card_id and c.user_id = auth.uid()
    )
  );

create policy card_invoices_update_own on public.card_invoices
  for update using (
    exists (
      select 1 from public.credit_cards c
      where c.id = card_invoices.card_id and c.user_id = auth.uid()
    )
  );

create policy card_invoices_delete_own on public.card_invoices
  for delete using (
    exists (
      select 1 from public.credit_cards c
      where c.id = card_invoices.card_id and c.user_id = auth.uid()
    )
  );


-- ============================================================================
-- card_invoice_payments — pagamentos da fatura (suporta split)
-- ============================================================================

create table if not exists public.card_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.card_invoices(id) on delete cascade,
  amount numeric not null check (amount > 0),
  paid_at date not null,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists card_invoice_payments_invoice_idx
  on public.card_invoice_payments (invoice_id);

-- RLS — via ownership da fatura → cartão → user
alter table public.card_invoice_payments enable row level security;

drop policy if exists card_invoice_payments_select_own on public.card_invoice_payments;
drop policy if exists card_invoice_payments_insert_own on public.card_invoice_payments;
drop policy if exists card_invoice_payments_update_own on public.card_invoice_payments;
drop policy if exists card_invoice_payments_delete_own on public.card_invoice_payments;

create policy card_invoice_payments_select_own on public.card_invoice_payments
  for select using (
    exists (
      select 1 from public.card_invoices i
      join public.credit_cards c on c.id = i.card_id
      where i.id = card_invoice_payments.invoice_id and c.user_id = auth.uid()
    )
  );

create policy card_invoice_payments_insert_own on public.card_invoice_payments
  for insert with check (
    exists (
      select 1 from public.card_invoices i
      join public.credit_cards c on c.id = i.card_id
      where i.id = card_invoice_payments.invoice_id and c.user_id = auth.uid()
    )
  );

create policy card_invoice_payments_update_own on public.card_invoice_payments
  for update using (
    exists (
      select 1 from public.card_invoices i
      join public.credit_cards c on c.id = i.card_id
      where i.id = card_invoice_payments.invoice_id and c.user_id = auth.uid()
    )
  );

create policy card_invoice_payments_delete_own on public.card_invoice_payments
  for delete using (
    exists (
      select 1 from public.card_invoices i
      join public.credit_cards c on c.id = i.card_id
      where i.id = card_invoice_payments.invoice_id and c.user_id = auth.uid()
    )
  );
