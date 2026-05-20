-- Migration: accounts table + account_id em transactions/recurrences + transfer_pair_id.
-- Idempotente — pode rodar várias vezes sem efeitos colaterais.
--
-- Conceito: dinheiro do usuário está em múltiplas contas (Nubank, Caixa, PicPay,
-- Itaú, Cofre/dinheiro físico). Saldo é calculado por conta = initial_balance +
-- sum(income) - sum(expense), ignorando type='transfer' direto mas considerando
-- as pernas (que têm type='income'/'expense' + transfer_pair_id setado).
--
-- Transferência entre contas = PAR de transações:
--   perna out: type='expense' + transfer_pair_id=X + account_id=A
--   perna in:  type='income'  + transfer_pair_id=X + account_id=B
--
-- getSummary e analytics ignoram transações com transfer_pair_id != null no
-- cálculo de saldo do mês/receita/despesa (transferência não é receita nem despesa).

-- ============================================================================
-- 1) TABELA ACCOUNTS
-- ============================================================================

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'checking',     -- checking | savings | cash | investment
  initial_balance numeric not null default 0,
  color text,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint accounts_kind_check
    check (kind in ('checking', 'savings', 'cash', 'investment'))
);

-- Unique case-insensitive por usuário
create unique index if not exists accounts_user_name_unique
  on public.accounts (user_id, lower(name));

create index if not exists accounts_user_active_idx
  on public.accounts (user_id, is_active);

-- Trigger updated_at
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists accounts_set_updated_at on public.accounts;
    create trigger accounts_set_updated_at
      before update on public.accounts
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- RLS
alter table public.accounts enable row level security;

drop policy if exists accounts_select_own on public.accounts;
drop policy if exists accounts_insert_own on public.accounts;
drop policy if exists accounts_update_own on public.accounts;
drop policy if exists accounts_delete_own on public.accounts;

create policy accounts_select_own on public.accounts
  for select using (user_id = auth.uid());

create policy accounts_insert_own on public.accounts
  for insert with check (user_id = auth.uid());

create policy accounts_update_own on public.accounts
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy accounts_delete_own on public.accounts
  for delete using (user_id = auth.uid());


-- ============================================================================
-- 2) FK account_id + transfer_pair_id em transactions
-- ============================================================================

alter table public.transactions
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

alter table public.transactions
  add column if not exists transfer_pair_id uuid;

alter table public.recurrences
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists transactions_account_idx
  on public.transactions (account_id) where account_id is not null;

create index if not exists transactions_transfer_pair_idx
  on public.transactions (transfer_pair_id) where transfer_pair_id is not null;

create index if not exists recurrences_account_idx
  on public.recurrences (account_id) where account_id is not null;


-- ============================================================================
-- 3) SEED AUTOMÁTICO — cria conta "Principal" para cada user existente
--    e vincula todas as transações/recorrências sem conta a ela
-- ============================================================================

-- Cria "Principal" para cada user_id que tenha pelo menos transação ou recorrência
insert into public.accounts (user_id, name, kind, initial_balance)
select distinct user_id, 'Principal', 'checking', 0
from (
  select user_id from public.transactions where user_id is not null
  union
  select user_id from public.recurrences where user_id is not null
) u
on conflict (user_id, lower(name)) do nothing;

-- Atribui transactions sem account_id à conta Principal do user
-- (mas não as compras de cartão — essas continuam sem account_id;
-- só o pagamento da fatura tem account_id)
update public.transactions t
set account_id = a.id
from public.accounts a
where t.account_id is null
  and t.user_id = a.user_id
  and lower(a.name) = 'principal'
  and t.card_id is null;

-- Atribui recurrences sem account_id à Principal do user (exceto as que pagam em cartão)
update public.recurrences r
set account_id = a.id
from public.accounts a
where r.account_id is null
  and r.user_id = a.user_id
  and lower(a.name) = 'principal'
  and r.card_id is null;
