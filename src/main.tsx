import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/router'
import { supabase } from '@/services'
import { useAuthStore } from '@/store'
import { useTransactionStore } from '@/store'
import '@/index.css'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setInitialized, fetchProfile } = useAuthStore()
  const { fetchCategories, fetchAliases, fetchTags } = useTransactionStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
        fetchCategories(session.user.id)
        fetchAliases(session.user.id)
        fetchTags(session.user.id)
      }
      setInitialized()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
        fetchCategories(session.user.id)
        fetchAliases(session.user.id)
        fetchTags(session.user.id)
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