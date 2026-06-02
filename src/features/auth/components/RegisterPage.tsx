import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/store'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signUp, loading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await signUp(email, password, name)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 bg-income/15 rounded-full flex items-center justify-center mb-5">
          <CheckCircle size={28} className="text-income" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Conta criada!</h2>
        <p className="text-text-secondary text-sm mb-8 text-center max-w-xs">
          Verifique seu e-mail para confirmar a conta antes de entrar.
        </p>
        <Link to="/login" className="btn-primary rounded-2xl px-8 py-3 text-sm font-semibold">
          Ir para login
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo + identidade */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <img
          src="/logo.png"
          alt="Finance Mirror"
          className="w-24 h-24 object-contain drop-shadow-lg"
        />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight leading-none">
            Finance Mirror
          </h1>
          <p className="text-[11px] text-text-muted uppercase tracking-[0.2em] mt-1.5">
            Seu reflexo financeiro.
          </p>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="w-full max-w-[320px] space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-base w-full rounded-2xl py-3.5 pl-5 text-sm"
          placeholder="Nome"
          required
          autoComplete="name"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-base w-full rounded-2xl py-3.5 pl-5 text-sm"
          placeholder="E-mail"
          required
          autoComplete="email"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-base w-full rounded-2xl py-3.5 pl-5 text-sm"
          placeholder="Senha (mínimo 6 caracteres)"
          minLength={6}
          required
          autoComplete="new-password"
        />

        {error && (
          <p className="text-expense text-sm text-center pt-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full rounded-2xl py-3.5 text-sm font-semibold mt-1"
        >
          {loading ? 'Criando…' : 'Criar conta'}
        </button>
      </form>

      <p className="text-center text-sm text-text-muted mt-8">
        Já tem conta?{' '}
        <Link
          to="/login"
          className="text-rubi hover:text-accent transition-colors font-medium"
        >
          Entrar
        </Link>
      </p>
    </div>
  )
}
