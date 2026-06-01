import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore, useTransactionStore } from '@/store'

export default function App() {
  useAuth()

  const { user } = useAuthStore()
  const { fetchCategories, fetchAliases, fetchTags } = useTransactionStore()

  // Restaura o tema salvo (padrão: dark — já definido no index.html)
  useEffect(() => {
    const saved = localStorage.getItem('fm-theme')
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    fetchCategories(user.id)
    fetchAliases(user.id)
    fetchTags(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
