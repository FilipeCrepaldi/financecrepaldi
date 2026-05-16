-- Migration: insights table for behavioral alerts
-- Idempotent — pode rodar várias vezes sem efeitos colaterais.

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  severity text not null default 'info',
  title text not null,
  body text not null,
  meta jsonb,
  is_read boolean not null default false,
  is_dismissed boolean not null default false,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create index if not exists idx_insights_user_state
  on public.insights (user_id, is_dismissed, is_read, created_at desc);

alter table public.insights enable row level security;

drop policy if exists insights_select_own on public.insights;
drop policy if exists insights_insert_own on public.insights;
drop policy if exists insights_update_own on public.insights;
drop policy if exists insights_delete_own on public.insights;

create policy insights_select_own on public.insights
  for select using (user_id = auth.uid());

create policy insights_insert_own on public.insights
  for insert with check (user_id = auth.uid());

create policy insights_update_own on public.insights
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy insights_delete_own on public.insights
  for delete using (user_id = auth.uid());
