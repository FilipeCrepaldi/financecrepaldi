import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore, useTransactionStore } from '@/store'

// Componente raiz que inicializa o estado global
export default function App() {
  useAuth() // inicializa sessão e listener

  const { user } = useAuthStore()
  const { fetchCategories, fetchAliases } = useTransactionStore()

  useEffect(() => {
    if (!user) return
    fetchCategories(user.id)
    fetchAliases(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return null // renderização feita pelo RouterProvider no main.tsx
}
