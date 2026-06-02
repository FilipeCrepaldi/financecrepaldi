import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signIn, loading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao entrar'
      if (msg.toLowerCase().includes('email not confirmed')) {
        setError('E-mail ainda não confirmado. Verifique sua caixa de entrada (e o spam) e clique no link de confirmação antes de entrar.')
      } else if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('E-mail ou senha incorretos.')
      } else {
        setError(msg)
      }
    }
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
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-base w-full rounded-2xl py-3.5 pl-5 text-sm"
          placeholder="E-mail"
          required
          autoComplete="email"
        />

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-base w-full rounded-2xl py-3.5 pl-5 pr-11 text-sm"
            placeholder="Senha"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <p className="text-expense text-sm text-center pt-1">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full rounded-2xl py-3.5 text-sm font-semibold mt-1"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="text-center pt-1">
          <button
            type="button"
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Esqueceu sua senha?
          </button>
        </p>
      </form>

      <p className="text-center text-sm text-text-muted mt-8">
        Não tem conta?{' '}
        <Link
          to="/register"
          className="text-rubi hover:text-accent transition-colors font-medium"
        >
          Criar conta
        </Link>
      </p>
    </div>
  )
}
