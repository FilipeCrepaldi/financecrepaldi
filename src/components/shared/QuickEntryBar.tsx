import { useEffect, useRef } from 'react'
import { Zap, ArrowRight, Tag } from 'lucide-react'
import { useQuickEntry } from '@/hooks/useQuickEntry'
import { useTransactionStore } from '@/store'
import { formatCurrency } from '@/utils'
import { cn } from '@/lib/utils'

interface QuickEntryBarProps {
  onClose: () => void
}

export function QuickEntryBar({ onClose }: QuickEntryBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { input, preview, loading, error, handleInput, submit } = useQuickEntry()
  const { categories } = useTransactionStore()

  useEffect(() => {
    inputRef.current?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && preview) submit().then(onClose)
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [preview]) // eslint-disable-line react-hooks/exhaustive-deps

  const category = categories.find((c) => c.id === preview?.categoryId)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg animate-slide-up">
        {/* Input principal */}
        <div className="card-elevated shadow-2xl">
          <div className="flex items-center gap-3">
            <Zap size={18} className="text-accent shrink-0" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="32 ifood almoço"
              className="flex-1 bg-transparent text-text-primary text-lg placeholder:text-text-muted outline-none font-mono"
            />
            {input && (
              <button
                onClick={() => handleInput('')}
                className="text-text-muted hover:text-text-primary transition-colors text-xs"
              >
                esc
              </button>
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-3 flex-wrap">
              <span className={cn(
                'text-xl font-mono font-semibold',
                preview.type === 'expense' ? 'text-expense' : 'text-income',
              )}>
                {preview.type === 'expense' ? '-' : '+'}{formatCurrency(preview.amount)}
              </span>

              {preview.merchantName && (
                <span className="text-text-primary text-sm font-medium">
                  {preview.merchantName}
                </span>
              )}

              {preview.description && (
                <span className="text-text-muted text-sm">
                  · {preview.description}
                </span>
              )}

              {category && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-background-tertiary text-text-secondary border border-border ml-auto">
                  <Tag size={10} />
                  {category.name}
                </span>
              )}
            </div>
          )}

          {error && (
            <p className="mt-2 text-sm text-expense">{error}</p>
          )}
        </div>

        {/* Hint */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-text-muted">
            Formato: <span className="font-mono text-text-secondary">valor merchant descrição</span>
          </p>
          {preview && (
            <button
              onClick={() => submit().then(onClose)}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover font-medium transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar'}
              <ArrowRight size={12} />
              <kbd className="font-mono bg-accent/10 px-1 rounded">↵</kbd>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
