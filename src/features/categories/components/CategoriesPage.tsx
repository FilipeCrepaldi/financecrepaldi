import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Globe } from 'lucide-react'
import { useAuthStore, useTransactionStore } from '@/store'
import { categoriesService } from '@/services'
import type { Category, CategoryType } from '@/types'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#7c6af7', '#22c55e', '#f97316', '#ef4444', '#3b82f6',
  '#eab308', '#ec4899', '#14b8a6', '#8b5cf6', '#64748b',
]

const TYPE_LABELS: Record<CategoryType, string> = {
  expense: 'Despesa',
  income: 'Receita',
  both: 'Ambos',
}

interface FormState {
  name: string
  icon: string
  color: string
  type: CategoryType
}

const emptyForm: FormState = { name: '', icon: '', color: '#7c6af7', type: 'expense' }

function CategoryForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState
  onSave: (f: FormState) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormState>(initial)

  return (
    <div className="flex flex-wrap items-end gap-2 p-3 bg-background-tertiary/50 rounded-lg border border-border">
      {/* Emoji / icon */}
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-text-muted mb-1">
          Ícone
        </label>
        <input
          type="text"
          value={form.icon}
          onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
          placeholder="🍕"
          maxLength={2}
          className="input-base w-14 text-center text-lg"
        />
      </div>

      {/* Nome */}
      <div className="flex-1 min-w-[140px]">
        <label className="block text-[10px] uppercase tracking-wide text-text-muted mb-1">
          Nome
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Ex: Pet, Academia..."
          className="input-base w-full"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onSave(form) }
            if (e.key === 'Escape') onCancel()
          }}
        />
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-text-muted mb-1">
          Tipo
        </label>
        <div className="inline-flex bg-background-secondary border border-border rounded-lg p-0.5">
          {(['expense', 'income', 'both'] as CategoryType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((p) => ({ ...p, type: t }))}
              className={cn(
                'px-2 py-1 text-xs font-medium rounded-md transition-colors',
                form.type === t
                  ? t === 'expense'
                    ? 'bg-expense text-white'
                    : t === 'income'
                      ? 'bg-income text-white'
                      : 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Cor */}
      <div>
        <label className="block text-[10px] uppercase tracking-wide text-text-muted mb-1">
          Cor
        </label>
        <div className="flex gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm((p) => ({ ...p, color: c }))}
              className={cn(
                'w-5 h-5 rounded-full transition-transform',
                form.color === c && 'ring-2 ring-offset-1 ring-offset-background-secondary scale-110',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-1.5 ml-auto">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="btn-ghost p-2"
        >
          <X size={14} />
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className="btn-primary p-2"
        >
          {saving ? '...' : <Check size={14} />}
        </button>
      </div>
    </div>
  )
}

export default function CategoriesPage() {
  const { user } = useAuthStore()
  const { categories, addCategory, updateCategory, removeCategory } = useTransactionStore()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const globalCats = categories.filter((c) => !c.user_id)
  const userCats = categories.filter((c) => !!c.user_id)

  const handleCreate = async (form: FormState) => {
    if (!user || !form.name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const created = await categoriesService.create(user.id, {
        name: form.name.trim(),
        icon: form.icon || null,
        color: form.color || null,
        type: form.type,
      })
      addCategory(created)
      setCreating(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar categoria.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (cat: Category, form: FormState) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await categoriesService.update(cat.id, {
        name: form.name.trim(),
        icon: form.icon || null,
        color: form.color || null,
        type: form.type,
      })
      updateCategory(updated)
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setError(null)
    try {
      await categoriesService.delete(id)
      removeCategory(id)
      setConfirmDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir. Pode haver transações vinculadas.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Categorias</h1>
          <p className="text-text-secondary text-sm mt-0.5">
            Crie categorias personalizadas para organizar melhor seus gastos
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => { setCreating(true); setEditingId(null) }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={14} />
            Nova
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Formulário de criação */}
      {creating && (
        <CategoryForm
          initial={emptyForm}
          onSave={handleCreate}
          onCancel={() => setCreating(false)}
          saving={saving}
        />
      )}

      {/* Categorias do usuário */}
      <div className="card">
        <h2 className="text-text-primary font-medium mb-3 flex items-center gap-2">
          Minhas categorias
          <span className="text-xs text-text-muted font-normal">({userCats.length})</span>
        </h2>

        {userCats.length === 0 ? (
          <p className="text-text-muted text-sm py-4 text-center">
            Nenhuma categoria customizada ainda.{' '}
            <button
              onClick={() => setCreating(true)}
              className="text-accent hover:underline"
            >
              Criar primeira
            </button>
          </p>
        ) : (
          <div className="space-y-1">
            {userCats.map((cat) =>
              editingId === cat.id ? (
                <CategoryForm
                  key={cat.id}
                  initial={{ name: cat.name, icon: cat.icon ?? '', color: cat.color ?? '#7c6af7', type: cat.type }}
                  onSave={(f) => handleUpdate(cat, f)}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              ) : (
                <div
                  key={cat.id}
                  className="group flex items-center gap-3 p-2 rounded-lg hover:bg-background-tertiary/50 transition-colors"
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ backgroundColor: cat.color ?? '#7c6af7' }}
                  >
                    {cat.icon ?? cat.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm text-text-primary">{cat.name}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium',
                      cat.type === 'expense'
                        ? 'bg-expense/15 text-expense'
                        : cat.type === 'income'
                          ? 'bg-income/15 text-income'
                          : 'bg-accent/15 text-accent',
                    )}
                  >
                    {TYPE_LABELS[cat.type]}
                  </span>

                  {confirmDeleteId === cat.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(cat.id)}
                        disabled={deletingId === cat.id}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-expense/20 text-expense hover:bg-expense/30 font-medium transition-colors"
                      >
                        {deletingId === cat.id ? '...' : 'Excluir'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[10px] px-1.5 py-0.5 rounded text-text-muted hover:text-text-primary"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                      <button
                        onClick={() => { setEditingId(cat.id); setCreating(false) }}
                        className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(cat.id)}
                        className="p-1 rounded text-text-muted hover:text-expense transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* Categorias globais — somente leitura */}
      <div className="card">
        <h2 className="text-text-primary font-medium mb-3 flex items-center gap-2">
          <Globe size={14} className="text-text-muted" />
          Categorias padrão
          <span className="text-xs text-text-muted font-normal">({globalCats.length})</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {globalCats.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 p-2 rounded-lg bg-background-tertiary/40"
            >
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                style={{ backgroundColor: cat.color ?? '#7c6af7' }}
              >
                {cat.icon ?? cat.name.charAt(0)}
              </span>
              <span className="text-sm text-text-secondary truncate">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
