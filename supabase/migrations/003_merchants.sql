-- Migration: merchants table + FK em transactions/recurrences + seed automático.
-- Idempotente — pode rodar várias vezes sem efeitos colaterais.
--
-- Promove merchant de texto livre para entidade de primeira classe.
-- Habilita autocomplete, categoria padrão sugerida e analytics por estabelecimento.

-- ============================================================================
-- 1) TABELA MERCHANTS
-- ============================================================================

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text,                            -- business | person | employer | bank | self (nullable)
  default_category_id uuid references public.categories(id) on delete set null,
  color text,
  aliases jsonb,                        -- array de strings alternativas (futuro: OCR/import)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique case-insensitive por usuário evita duplicatas tipo "iFood" / "ifood"
create unique index if not exists merchants_user_name_unique
  on public.merchants (user_id, lower(name));

create index if not exists merchants_user_idx
  on public.merchants (user_id, name);

-- Trigger de updated_at (reusa função set_updated_at se existir)
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists merchants_set_updated_at on public.merchants;
    create trigger merchants_set_updated_at
      before update on public.merchants
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- RLS
alter table public.merchants enable row level security;

drop policy if exists merchants_select_own on public.merchants;
drop policy if exists merchants_insert_own on public.merchants;
drop policy if exists merchants_update_own on public.merchants;
drop policy if exists merchants_delete_own on public.merchants;

create policy merchants_select_own on public.merchants
  for select using (user_id = auth.uid());

create policy merchants_insert_own on public.merchants
  for insert with check (user_id = auth.uid());

create policy merchants_update_own on public.merchants
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy merchants_delete_own on public.merchants
  for delete using (user_id = auth.uid());


-- ============================================================================
-- 2) FK merchant_id em transactions e recurrences
-- ============================================================================

alter table public.transactions
  add column if not exists merchant_id uuid references public.merchants(id) on delete set null;

alter table public.recurrences
  add column if not exists merchant_id uuid references public.merchants(id) on delete set null;

create index if not exists transactions_merchant_idx
  on public.transactions (merchant_id) where merchant_id is not null;

create index if not exists recurrences_merchant_idx
  on public.recurrences (merchant_id) where merchant_id is not null;


-- ============================================================================
-- 3) SEED AUTOMÁTICO — popula merchants a partir do que já existe
-- ============================================================================
-- Para cada (user_id, merchant_name) distinto presente em transactions/recurrences:
--   - cria registro em merchants
--   - default_category_id = categoria mais frequente nesse merchant
--   - kind permanece null (usuário ajusta depois na UI)
-- Depois liga transactions.merchant_id e recurrences.merchant_id ao registro criado.

with merchant_sources as (
  -- transações com merchant
  select
    user_id,
    btrim(merchant_name) as name,
    category_id
  from public.transactions
  where merchant_name is not null
    and btrim(merchant_name) <> ''

  union all

  -- recorrências com merchant
  select
    user_id,
    btrim(merchant_name) as name,
    category_id
  from public.recurrences
  where merchant_name is not null
    and btrim(merchant_name) <> ''
),
-- conta cada combinação (user, merchant, categoria)
merchant_category_counts as (
  select
    user_id,
    lower(name) as name_key,
    name,
    category_id,
    count(*) as uses
  from merchant_sources
  group by user_id, lower(name), name, category_id
),
-- escolhe categoria mais frequente por merchant (empate desempata pela maior contagem; null cai por último)
merchant_top_category as (
  select distinct on (user_id, name_key)
    user_id,
    name_key,
    name,
    category_id
  from merchant_category_counts
  order by user_id, name_key, (category_id is null), uses desc, category_id
)
insert into public.merchants (user_id, name, default_category_id)
select user_id, name, category_id
from merchant_top_category
on conflict (user_id, lower(name)) do nothing;

-- Liga transactions.merchant_id ao merchant correspondente (case-insensitive)
update public.transactions t
set merchant_id = m.id
from public.merchants m
where t.merchant_id is null
  and t.merchant_name is not null
  and t.user_id = m.user_id
  and lower(btrim(t.merchant_name)) = lower(m.name);

-- Liga recurrences.merchant_id ao merchant correspondente
update public.recurrences r
set merchant_id = m.id
from public.merchants m
where r.merchant_id is null
  and r.merchant_name is not null
  and r.user_id = m.user_id
  and lower(btrim(r.merchant_name)) = lower(m.name);
