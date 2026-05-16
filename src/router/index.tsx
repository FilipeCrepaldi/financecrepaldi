import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { AppLayout } from '@/components/shared/AppLayout'
import { LoadingScreen } from '@/components/shared/LoadingScreen'

// Lazy imports
const LoginPage = lazy(() => import('@/features/auth/components/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/components/RegisterPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/components/DashboardPage'))
const TransactionsPage = lazy(() => import('@/features/transactions/components/TransactionsPage'))
const BudgetsPage = lazy(() => import('@/features/budgets/components/BudgetsPage'))
const AnalyticsPage = lazy(() => import('@/features/analytics/components/AnalyticsPage'))
const RecurrencesPage = lazy(() => import('@/features/recurrences/components/RecurrencesPage'))
const InsightsPage = lazy(() => import('@/features/insights/components/InsightsPage'))

// Guard de rota autenticada
function ProtectedRoute() {
  const { user, initialized } = useAuthStore()

  if (!initialized) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  return (
    <AppLayout>
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  )
}

// Guard de rota pública (redireciona se já logado)
function PublicRoute() {
  const { user, initialized } = useAuthStore()

  if (!initialized) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/transactions', element: <TransactionsPage /> },
      { path: '/budgets', element: <BudgetsPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/recurrences', element: <RecurrencesPage /> },
      { path: '/insights', element: <InsightsPage /> },
    ],
  },
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
