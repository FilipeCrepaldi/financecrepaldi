-- Migration: adiciona colunas de cartão/fatura/parcelamento em transactions e recurrences.
-- Idempotente.
--
-- transactions:
--   card_id          → cartão que pagou a compra (NULL = pago em caixa)
--   invoice_id       → fatura à qual a compra está atribuída
--   installment_total/installment_number/installment_group_id → parcelamento
--
-- recurrences:
--   card_id          → recorrência paga via cartão
--   installment_total → simula parcelamento (opcional, para PR 3)

alter table public.transactions
  add column if not exists card_id uuid references public.credit_cards(id) on delete set null;

alter table public.transactions
  add column if not exists invoice_id uuid references public.card_invoices(id) on delete set null;

alter table public.transactions
  add column if not exists installment_total int;

alter table public.transactions
  add column if not exists installment_number int;

alter table public.transactions
  add column if not exists installment_group_id uuid;

alter table public.recurrences
  add column if not exists card_id uuid references public.credit_cards(id) on delete set null;

alter table public.recurrences
  add column if not exists installment_total int;


-- Indexes nos novos FKs (parciais — só linhas que usam cartão)
create index if not exists transactions_card_idx
  on public.transactions (card_id) where card_id is not null;

create index if not exists transactions_invoice_idx
  on public.transactions (invoice_id) where invoice_id is not null;

create index if not exists transactions_installment_group_idx
  on public.transactions (installment_group_id) where installment_group_id is not null;

create index if not exists recurrences_card_idx
  on public.recurrences (card_id) where card_id is not null;
