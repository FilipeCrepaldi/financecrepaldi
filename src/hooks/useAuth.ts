import { useEffect } from 'react'
import { supabase } from '@/services'
import { useAuthStore } from '@/store'

export function useAuth() {
  const { setSession, setInitialized, fetchProfile, signIn, signUp, signOut, user, profile, loading } =
    useAuthStore()

  useEffect(() => {
    // Pega sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      setInitialized()
    })

    // Listener para mudanças de estado
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session?.user) fetchProfile(session.user.id)
        else setInitialized()
      },
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user, profile, loading, signIn, signUp, signOut }
}
