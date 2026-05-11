import { useState, useCallback } from 'react'
import { useAuthStore, useTransactionStore } from '@/store'
import { transactionsService } from '@/services'
import { parseQuickEntry, suggestCategoryFromText } from '@/utils'
import type { ParsedEntry } from '@/types'

export function useQuickEntry() {
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState<ParsedEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuthStore()
  const { aliases, categories, addTransaction } = useTransactionStore()

  const handleInput = useCallback(
    (value: string) => {
      setInput(value)
      setError(null)

      if (!value.trim()) {
        setPreview(null)
        return
      }

      const parsed = parseQuickEntry(value, aliases as never)
      if (parsed) {
        // Fallback de categoria por palavras-chave se alias não encontrou
        if (!parsed.categoryId) {
          parsed.categoryId = suggestCategoryFromText(parsed.merchantRaw, categories)
        }
        setPreview(parsed)
      } else {
        setPreview(null)
      }
    },
    [aliases, categories],
  )

  const submit = useCallback(async () => {
    if (!preview || !user) return

    setLoading(true)
    setError(null)

    try {
      const transaction = await transactionsService.create(user.id, {
        type: preview.type,
        amount: String(preview.amount),
        description: preview.description ?? '',
        merchant_name: preview.merchantName ?? '',
        category_id: preview.categoryId ?? '',
        date: preview.date,
        notes: '',
        tags: [],
      })

      addTransaction(transaction)
      setInput('')
      setPreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }, [preview, user, addTransaction])

  return { input, preview, loading, error, handleInput, submit }
}
