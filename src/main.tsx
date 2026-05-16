import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { supabase } from '@/services'
import { useAuthStore } from '@/store'
import { useTransactionStore, useRecurrencesStore, useInsightsStore } from '@/store'
import '@/index.css'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setInitialized, fetchProfile } = useAuthStore()
  const { fetchCategories, fetchAliases, fetchTags } = useTransactionStore()
  const { fetchRecurrences } = useRecurrencesStore()
  const { fetchInsights, generateInsights } = useInsightsStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        const uid = session.user.id
        fetchProfile(uid)
        fetchCategories(uid)
        fetchAliases(uid)
        fetchTags(uid)
        fetchRecurrences(uid)
        // Mostra o que já existe imediatamente, depois re-analisa em background
        fetchInsights(uid).then(() => generateInsights(uid))
      }
      setInitialized()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        const uid = session.user.id
        fetchProfile(uid)
        fetchCategories(uid)
        fetchAliases(uid)
        fetchTags(uid)
        fetchRecurrences(uid)
        fetchInsights(uid).then(() => generateInsights(uid))
      } else {
        setInitialized()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return <>{children}</>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)