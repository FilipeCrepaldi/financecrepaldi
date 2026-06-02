import { useNavigate } from 'react-router-dom'
import { HelpCircle, Zap, ArrowRight, X } from 'lucide-react'

interface WelcomeModalProps {
  userName: string
  onClose: () => void
}

export function WelcomeModal({ userName, onClose }: WelcomeModalProps) {
  const navigate = useNavigate()

  const goToHelp = () => {
    onClose()
    navigate('/help')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-background-secondary border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Faixa decorativa */}
        <div className="h-1 w-full bg-gradient-to-r from-wine via-rubi to-accent" />

        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-tertiary transition-colors"
          >
            <X size={15} />
          </button>

          {/* Ícone */}
          <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mb-5">
            <HelpCircle size={26} className="text-accent" />
          </div>

          {/* Texto */}
          <h2 className="text-xl font-semibold text-text-primary mb-1">
            Bem-vindo, {userName.split(' ')[0]}!
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-5">
            Sua conta foi criada com sucesso. Antes de começar a lançar,
            recomendamos dar uma olhada na aba{' '}
            <span className="text-accent font-medium">Como usar?</span> — leva
            menos de 2 minutos e vai te mostrar tudo que o Finance Mirror pode
            fazer por você.
          </p>

          {/* Dicas rápidas */}
          <div className="space-y-2 mb-6">
            {[
              { icon: Zap, text: 'Pressione K para lançar qualquer transação em segundos' },
              { icon: HelpCircle, text: 'A aba "Como usar?" explica cada funcionalidade com exemplos' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-md bg-accent/12 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={11} className="text-accent" />
                </span>
                <span className="text-xs text-text-muted leading-relaxed">{text}</span>
              </div>
            ))}
          </div>

          {/* Ações */}
          <div className="flex gap-2">
            <button
              onClick={goToHelp}
              className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2.5"
            >
              Ver Como usar
              <ArrowRight size={14} />
            </button>
            <button
              onClick={onClose}
              className="btn-ghost px-4 text-sm text-text-secondary py-2.5"
            >
              Explorar sozinho
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
