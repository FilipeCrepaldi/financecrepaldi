-- ============================================================
-- Migration 001: Tags globais comportamentais
-- ============================================================
-- Rode este SQL no SQL Editor do Supabase.
-- Permite tags com user_id NULL (globais) e cria 5 tags comportamentais.
-- ============================================================

-- 1. Permitir user_id NULL na tabela tags (tag global)
ALTER TABLE tags ALTER COLUMN user_id DROP NOT NULL;

-- 2. Atualizar políticas RLS para permitir leitura de tags globais.
--    Removemos a policy antiga de SELECT (se existir) e criamos uma nova
--    que dá acesso a tags do próprio usuário OU globais (user_id IS NULL).
DROP POLICY IF EXISTS "Users can view their own tags" ON tags;
DROP POLICY IF EXISTS "Users can read own tags" ON tags;
DROP POLICY IF EXISTS "Users can select own tags" ON tags;
DROP POLICY IF EXISTS "tags_select_own" ON tags;

CREATE POLICY "tags_select_own_or_global" ON tags
  FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

-- INSERT/UPDATE/DELETE continuam restritos ao próprio usuário.
-- (Se as policies existentes já cobrem isso, não precisa mexer. Caso queira garantir:)
DROP POLICY IF EXISTS "tags_insert_own" ON tags;
CREATE POLICY "tags_insert_own" ON tags
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tags_update_own" ON tags;
CREATE POLICY "tags_update_own" ON tags
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "tags_delete_own" ON tags;
CREATE POLICY "tags_delete_own" ON tags
  FOR DELETE
  USING (user_id = auth.uid());

-- 3. Inserir tags comportamentais globais (idempotente)
INSERT INTO tags (user_id, name, color)
SELECT NULL, name, color FROM (VALUES
  ('impulso',     '#f43f5e'),
  ('necessário',  '#22c55e'),
  ('conforto',    '#7c6af7'),
  ('crescimento', '#f59e0b'),
  ('emergência',  '#ef4444')
) AS new_tags(name, color)
WHERE NOT EXISTS (
  SELECT 1 FROM tags
  WHERE tags.user_id IS NULL AND tags.name = new_tags.name
);
