import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 bg-income/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap size={20} className="text-income" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Conta criada!</h2>
          <p className="text-text-secondary text-sm mb-6">
            Verifique seu email para confirmar a conta.
          </p>
          <Link to="/login" className="btn-primary inline-block">
            Ir para login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-semibold text-text-primary text-lg">Finance Mirror</span>
        </div>

        <h1 className="text-2xl font-semibold text-text-primary mb-1">Criar conta</h1>
        <p className="text-text-secondary text-sm mb-6">Comece a entender seu dinheiro.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-base w-full"
              placeholder="Seu nome"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base w-full"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base w-full"
              placeholder="mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>

          {error && <p className="text-expense text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Já tem conta?{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
