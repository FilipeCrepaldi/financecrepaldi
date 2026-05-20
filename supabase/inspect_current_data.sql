-- =====================================================================
-- Inspeção do estado atual — Finance Mirror
-- Rode bloco por bloco no Supabase SQL Editor e me mande o resultado.
-- Tudo é SELECT (read-only). Filtra automaticamente pelo seu user logado
-- via auth.uid() — não precisa trocar nenhum ID.
-- =====================================================================


-- 1) PERFIL / contexto
select
  id,
  email,
  full_name,
  currency,
  created_at
from public.profiles
where id = auth.uid();


-- 2) CATEGORIAS (suas + as globais visíveis a você)
select
  id,
  user_id is null as is_global,
  name,
  type,
  icon,
  color,
  is_default
from public.categories
where user_id is null or user_id = auth.uid()
order by user_id nulls first, type, name;


-- 3) TAGS (suas + globais)
select
  id,
  user_id is null as is_global,
  name,
  color,
  created_at
from public.tags
where user_id is null or user_id = auth.uid()
order by user_id nulls first, name;


-- 4) MERCHANT ALIASES (patterns globais + customizados seus)
select
  id,
  is_global,
  pattern,
  merchant_name,
  category_id,
  user_id
from public.merchant_aliases
where is_global = true or user_id = auth.uid()
order by is_global desc, merchant_name;


-- 5) TRANSAÇÕES — todas, com categoria e tags resolvidas
select
  t.id,
  t.date,
  t.type,
  t.amount,
  t.description,
  t.merchant_name,
  c.name as category_name,
  c.type as category_type,
  t.recurrence_id,
  t.is_confirmed,
  t.notes,
  t.created_at,
  coalesce(
    (
      select string_agg(tg.name, ', ' order by tg.name)
      from public.transaction_tags tt
      join public.tags tg on tg.id = tt.tag_id
      where tt.transaction_id = t.id
    ),
    ''
  ) as tags
from public.transactions t
left join public.categories c on c.id = t.category_id
where t.user_id = auth.uid()
order by t.date desc, t.created_at desc;
  

-- 6) RECORRÊNCIAS — todas, com categoria
select
  r.id,
  r.name,
  r.merchant_name,
  r.amount,
  r.frequency,
  r.next_due_date,
  c.name as category_name,
  c.type as category_type,
  r.is_active,
  r.created_at
from public.recurrences r
left join public.categories c on c.id = r.category_id
where r.user_id = auth.uid()
order by r.is_active desc, r.next_due_date;


-- 7) ORÇAMENTOS
select
  b.id,
  c.name as category_name,
  b.amount as limit_amount,
  b.month,
  b.year
from public.budgets b
left join public.categories c on c.id = b.category_id
where b.user_id = auth.uid()
order by b.year desc, b.month desc, category_name;


-- 8) INSIGHTS (já existem? só pra eu ver formato)
select
  id,
  type,
  severity,
  title,
  is_read,
  is_dismissed,
  fingerprint,
  created_at
from public.insights
where user_id = auth.uid()
order by created_at desc
limit 20;


-- 9) MERCHANT_NAMES distintos já usados (= seu "registro implícito" de estabelecimentos)
-- Mostra todos os nomes que você já digitou em transações ou recorrências.
-- É a base do que precisamos migrar/popular na nova tabela `merchants`.
with merch_tx as (
  select
    merchant_name,
    category_id,
    'transaction' as source,
    count(*) as uses
  from public.transactions
  where user_id = auth.uid()
    and merchant_name is not null
    and trim(merchant_name) <> ''
  group by merchant_name, category_id
),
merch_rec as (
  select
    merchant_name,
    category_id,
    'recurrence' as source,
    count(*) as uses
  from public.recurrences
  where user_id = auth.uid()
    and merchant_name is not null
    and trim(merchant_name) <> ''
  group by merchant_name, category_id
)
select
  m.merchant_name,
  m.source,
  m.uses,
  c.name as suggested_category
from (
  select * from merch_tx
  union all
  select * from merch_rec
) m
left join public.categories c on c.id = m.category_id
order by m.merchant_name, m.source;


-- 10) Resumo numérico geral (sanity check)
select
  (select count(*) from public.transactions where user_id = auth.uid()) as total_transactions,
  (select count(*) from public.recurrences  where user_id = auth.uid()) as total_recurrences,
  (select count(*) from public.budgets      where user_id = auth.uid()) as total_budgets,
  (select count(*) from public.insights     where user_id = auth.uid()) as total_insights,
  (select count(*) from public.merchant_aliases where user_id = auth.uid()) as custom_aliases,
  (select count(*) from public.categories   where user_id = auth.uid()) as custom_categories,
  (select count(*) from public.tags         where user_id = auth.uid()) as custom_tags;
