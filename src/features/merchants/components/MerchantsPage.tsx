import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Search, Merge, X } from 'lucide-react'
import type { Merchant } from '@/types'
import {
  useAuthStore,
  useMerchantsStore,
  useTransactionStore,
} from '@/store'
import { merchantsService } from '@/services'
import { cn } from '@/lib/utils'
import { MerchantEditModal } from './MerchantEditModal'

const KIND_LABEL: Record<string, string> = {
  business: 'Comércio',
  person: 'Pessoa',
  employer: 'Empregador',
  bank: 'Banco',
  self: 'Eu mesmo',
}

export default function MerchantsPage() {
  const { user } = useAuthStore()
  const { merchants, loading, fetchMerchants, removeMerchant, applyMerge } =
    useMerchantsStore()
  const { categories } = useTransactionStore()

  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Merchant | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchMerchants(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return merchants
    return merchants.filter((m) => m.name.toLowerCase().includes(q))
  }, [merchants, query])

  const handleNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (m: Merchant) => {
    setEditing(m)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditing(null)
  }

  const handleDelete = async (id: string) => {
    await merchantsService.delete(id)
    removeMerchant(id)
    setConfirmingDelete(null)
    setSelectedIds((s) => {
      const next = new Set(s)
      next.delete(id)
      return next
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setMergeTargetId(null)
  }

  const selectedMerchants = useMemo(
    () => merchants.filter((m) => selectedIds.has(m.id)),
    [merchants, selectedIds],
  )

  const handleMerge = async () => {
    if (!mergeTargetId || selectedMerchants.length < 2) return
    setMerging(true)
    try {
      const sources = selectedMerchants.filter((m) => m.id !== mergeTargetId)
      for (const src of sources) {
        await merchantsService.merge(src.id, mergeTargetId)
        applyMerge(src.id, mergeTargetId)
      }
      clearSelection()
    } catch (err) {
      console.error('Erro ao mesclar', err)
    } finally {
      setMerging(false)
    }
  }

  const isEmpty = !loading && merchants.length === 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Estabelecimentos
          </h1>
          <p className="text-text-secondary text-sm mt-0.5">
            {merchants.length}{' '}
            {merchants.length === 1 ? 'cadastrado' : 'cadastrados'}
          </p>
        </div>
        <button
          onClick={handleNew}
          className="btn-primary text-sm py-2 flex items-center gap-1.5"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Novo</span>
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar..."
          className="input-base w-full pl-9"
        />
      </div>

      {/* Barra de seleção (mesclar) */}
      {selectedIds.size > 0 && (
        <div className="card border-accent/40 bg-accent/5 flex flex-wrap items-center gap-3">
          <span className="text-sm text-text-primary">
            {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          {selectedIds.size >= 2 && (
            <>
              <span className="text-text-muted text-xs">Mesclar em:</span>
              <select
                value={mergeTargetId ?? ''}
                onChange={(e) => setMergeTargetId(e.target.value || null)}
                className="input-base text-sm py-1 flex-1 min-w-[140px]"
              >
                <option value="">Escolher destino</option>
                {selectedMerchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleMerge}
                disabled={!mergeTargetId || merging}
                className="btn-primary text-sm py-1 px-3 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Merge size={12} />
                {merging ? 'Mesclando...' : 'Mesclar'}
              </button>
            </>
          )}
          <button
            onClick={clearSelection}
            className="btn-ghost text-sm py-1 px-2 flex items-center gap-1"
          >
            <X size={12} />
            Limpar
          </button>
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="card text-center py-12">
          <p className="text-text-muted text-sm">Carregando...</p>
        </div>
      ) : isEmpty ? (
        <div className="card text-center py-12">
          <p className="text-text-primary font-medium">
            Nenhum estabelecimento ainda
          </p>
          <p className="text-text-muted text-sm mt-1 mb-5">
            Cadastre seus estabelecimentos para autocomplete e categoria
            sugerida.
          </p>
          <button
            onClick={handleNew}
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            Cadastrar primeiro
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-text-muted text-sm">
            Nenhum resultado para &quot;{query}&quot;
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((m) => {
            const selected = selectedIds.has(m.id)
            const isConfirming = confirmingDelete === m.id
            const category = categories.find((c) => c.id === m.default_category_id)
            const dotColor = m.color ?? category?.color ?? '#7c6af7'
            return (
              <div
                key={m.id}
                className={cn(
                  'card group transition-colors',
                  selected && 'border-accent bg-accent/5',
                )}
              >
                <div className="flex items-start gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelect(m.id)}
                    className="accent-accent mt-1 shrink-0"
                  />
                  <div
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-medium"
                    style={{ backgroundColor: dotColor }}
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-text-primary font-medium truncate">
                      {m.name}
                    </h3>
                    <p className="text-text-muted text-xs truncate">
                      {category?.name ?? 'Sem categoria'}
                      {m.kind && ` · ${KIND_LABEL[m.kind] ?? m.kind}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1">
                  {isConfirming ? (
                    <>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-xs px-2 py-0.5 rounded bg-expense/20 text-expense hover:bg-expense/30 font-medium"
                      >
                        Excluir
                      </button>
                      <button
                        onClick={() => setConfirmingDelete(null)}
                        className="text-xs px-2 py-0.5 rounded text-text-muted hover:text-text-primary"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(m)}
                        className="text-text-muted hover:text-text-primary p-1 rounded"
                        aria-label="Editar"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => setConfirmingDelete(m.id)}
                        className="text-text-muted hover:text-expense p-1 rounded"
                        aria-label="Excluir"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <MerchantEditModal merchant={editing} onClose={handleClose} />
      )}
    </div>
  )
}
