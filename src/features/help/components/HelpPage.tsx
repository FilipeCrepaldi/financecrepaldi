import { useState } from 'react'
import {
  LayoutDashboard, ArrowLeftRight, Target, RefreshCw, BarChart3,
  Sparkles, Store, CreditCard, Wallet, Tags, Zap, ChevronDown,
  ChevronRight, Lightbulb, TrendingUp, ShieldCheck, Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Section {
  id: string
  icon: LucideIcon
  title: string
  subtitle: string
  content: React.ReactNode
}

function Accordion({ section }: { section: Section }) {
  const [open, setOpen] = useState(false)
  const Icon = section.icon
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 text-left"
      >
        <span className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
          <Icon size={15} className="text-accent" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary font-medium text-sm">{section.title}</p>
          <p className="text-text-muted text-xs mt-0.5">{section.subtitle}</p>
        </div>
        {open ? (
          <ChevronDown size={15} className="text-text-muted shrink-0" />
        ) : (
          <ChevronRight size={15} className="text-text-muted shrink-0" />
        )}
      </button>
      {open && (
        <div className="mt-4 pt-4 border-t border-border text-sm text-text-secondary space-y-3">
          {section.content}
        </div>
      )}
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 bg-accent/8 border border-accent/20 rounded-lg">
      <Lightbulb size={14} className="text-accent shrink-0 mt-0.5" />
      <span className="text-xs text-text-secondary">{children}</span>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </span>
      <span className="text-xs leading-relaxed">{children}</span>
    </div>
  )
}

function Ex({ label, result }: { label: string; result: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-1 border-b border-border/50 last:border-0">
      <code className="text-xs font-mono bg-background-tertiary px-2 py-0.5 rounded text-accent shrink-0">
        {label}
      </code>
      <span className="text-xs text-text-muted sm:ml-2">→ {result}</span>
    </div>
  )
}

const SECTIONS: Section[] = [
  {
    id: 'quick-entry',
    icon: Zap,
    title: 'Lançamento Rápido (Quick Entry)',
    subtitle: 'A forma mais rápida de registrar qualquer transação',
    content: (
      <>
        <p>Pressione <kbd className="text-[10px] bg-background-tertiary border border-border px-1.5 py-0.5 rounded font-mono">K</kbd> em qualquer tela para abrir o lançamento rápido. Digite em texto natural e o sistema interpreta automaticamente.</p>
        <div className="space-y-1 mt-2">
          <Ex label="32 ifood almoço" result="Despesa R$32 · iFood · descrição: almoço" />
          <Ex label="150 salário" result="Receita R$150 · categoria Salário" />
          <Ex label="45.90 uber corrida trabalho" result="Despesa R$45,90 · Uber · Transporte" />
          <Ex label="1200 leonis pix recebido" result="Receita R$1.200 · merchant: Leonis" />
        </div>
        <Tip>O sistema reconhece automaticamente merchants como iFood, Uber, Netflix, Nubank e mais 18 nomes pré-configurados. Pressione <strong>Enter</strong> para confirmar.</Tip>
      </>
    ),
  },
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    subtitle: 'Visão geral do mês atual em tempo real',
    content: (
      <>
        <p>O Dashboard mostra uma fotografia do seu mês em ordem de relevância:</p>
        <ul className="space-y-1.5 list-none mt-2">
          <li className="flex gap-2"><span className="text-accent font-medium shrink-0">Saldo:</span> receitas − despesas pagas em caixa (compras no cartão <strong>não</strong> entram aqui)</li>
          <li className="flex gap-2"><span className="text-income font-medium shrink-0">Receita:</span> tudo que entrou no caixa no mês</li>
          <li className="flex gap-2"><span className="text-expense font-medium shrink-0">Despesa:</span> saídas confirmadas do caixa</li>
          <li className="flex gap-2"><span className="text-text-secondary font-medium shrink-0">Compromisso:</span> parcelas e faturas de cartão ainda a pagar</li>
        </ul>
        <Tip>Vencimentos dos próximos 3 dias aparecem em banner no topo. Você pode pagar diretamente por ali com um clique.</Tip>
      </>
    ),
  },
  {
    id: 'transactions',
    icon: ArrowLeftRight,
    title: 'Transações',
    subtitle: 'Registro completo de entradas, saídas e transferências',
    content: (
      <>
        <p>Atalho <kbd className="text-[10px] bg-background-tertiary border border-border px-1.5 py-0.5 rounded font-mono">N</kbd> abre o formulário completo.</p>
        <div className="space-y-2 mt-2">
          <Step n={1}>Escolha o <strong>tipo</strong>: Receita, Despesa ou Transferência.</Step>
          <Step n={2}>Para despesas, escolha <strong>Caixa</strong> (sai do saldo imediatamente) ou <strong>Cartão</strong> (entra na fatura do cartão).</Step>
          <Step n={3}>Se for cartão, defina <strong>À vista</strong> ou <strong>Parcele em N×</strong> — o sistema distribui as parcelas automaticamente nas faturas dos meses corretos.</Step>
          <Step n={4}>Escolha a <strong>conta</strong> (Nubank, C6, Carteira…) para rastrear onde o dinheiro entrou ou saiu.</Step>
          <Step n={5}>Adicione <strong>tags comportamentais</strong> como <em>impulso</em>, <em>necessário</em> ou <em>crescimento</em> para análise posterior.</Step>
        </div>
        <Tip>Transações com <strong>transfer_pair</strong> (transferências entre contas) são excluídas dos totais de receita/despesa para não duplicar.</Tip>
      </>
    ),
  },
  {
    id: 'budgets',
    icon: Target,
    title: 'Orçamentos',
    subtitle: 'Defina limites mensais por categoria',
    content: (
      <>
        <p>Crie um orçamento para cada categoria que você quer controlar. Exemplo: "Alimentação — R$800/mês".</p>
        <ul className="space-y-1.5 mt-2 list-none">
          <li className="flex gap-2"><span className="text-income font-medium shrink-0">Verde:</span> abaixo de 80% do limite</li>
          <li className="flex gap-2"><span className="text-accent font-medium shrink-0">Amarelo:</span> entre 80% e 100% — atenção</li>
          <li className="flex gap-2"><span className="text-expense font-medium shrink-0">Vermelho:</span> estourou o limite</li>
        </ul>
        <Tip>O insight <strong>budget_overrun</strong> gera um alerta automático quando você passa de 80%. Você verá o aviso no Dashboard → Insights.</Tip>
      </>
    ),
  },
  {
    id: 'recurrences',
    icon: RefreshCw,
    title: 'Recorrências',
    subtitle: 'Contas fixas e receitas que se repetem',
    content: (
      <>
        <p>Cadastre gastos fixos (aluguel, assinaturas, academia) e receitas recorrentes (salário, freelas mensais).</p>
        <div className="space-y-2 mt-2">
          <Step n={1}>Defina o nome, merchant, valor e frequência (diária, semanal, mensal, anual).</Step>
          <Step n={2}>O sistema agrupa por <strong>Atrasadas / Esta semana / Este mês / Mais tarde / Pausadas</strong>.</Step>
          <Step n={3}>Clique em <strong>"Marcar pago"</strong> ou <strong>"Confirmar recebimento"</strong> para gerar a transação e avançar a data automaticamente.</Step>
        </div>
        <Tip>Se você lançar uma transação para um merchant que você já pagou 2+ vezes nos últimos 90 dias, o sistema sugere automaticamente criar uma recorrência.</Tip>
      </>
    ),
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics',
    subtitle: 'Gráficos e padrões comportamentais',
    content: (
      <>
        <p>Filtre por <strong>fonte</strong> (todos, só caixa, ou cartão específico) e <strong>período</strong> (1m / 3m / 6m / 1a).</p>
        <ul className="space-y-2 mt-2 list-none">
          <li><span className="text-accent font-medium">Donut por categoria</span> — top 8 + "Outras" em cinza. Passe o mouse para ver valor exato.</li>
          <li><span className="text-accent font-medium">Linha temporal</span> — receita, despesa e saldo acumulado mês a mês.</li>
          <li><span className="text-accent font-medium">Heatmap por dia da semana</span> — identifica padrões (ex: você gasta mais às sextas).</li>
          <li><span className="text-accent font-medium">Top merchants + tags</span> — onde vai mais dinheiro e quais tags dominam.</li>
          <li><span className="text-accent font-medium">Score de estabilidade (0–100)</span> — 40% comprometimento de renda + 30% variação de gasto + 30% controle de impulso.</li>
        </ul>
        <Tip>Um score acima de 70 indica boa saúde financeira comportamental. Abaixo de 40 é sinal de que gastos imprevisíveis ou impulso estão elevados.</Tip>
      </>
    ),
  },
  {
    id: 'insights',
    icon: Sparkles,
    title: 'Insights',
    subtitle: '8 alertas automáticos baseados no seu comportamento',
    content: (
      <>
        <p>O sistema gera insights automaticamente ao carregar. Os 3 mais urgentes aparecem no Dashboard.</p>
        <div className="space-y-1.5 mt-2">
          <Ex label="budget_overrun" result="Categoria ultrapassou 80% ou 100% do orçamento" />
          <Ex label="spike" result="Gasto 1,5× acima da média dos últimos 3 meses" />
          <Ex label="recurrence_missed" result="Recorrência vencida há 7+ dias sem baixa" />
          <Ex label="streak" result="Dias consecutivos sem tag impulso (7, 14, 30 dias)" />
          <Ex label="card_limit" result="Limite do cartão usado ≥ 80% (warning) ou 100% (critical)" />
          <Ex label="card_commitment" result="Parcelas a vencer em 6 meses ≥ R$500" />
          <Ex label="card_third_party" result="Uso mensal em cartão emprestado detectado" />
          <Ex label="invoice_due" result="Fatura vencendo em ≤ 3 dias com saldo pendente" />
        </div>
        <Tip>Você pode marcar como lido ou descartar cada insight. O badge no menu lateral mostra quantos não lidos existem.</Tip>
      </>
    ),
  },
  {
    id: 'cards',
    icon: CreditCard,
    title: 'Cartões de crédito',
    subtitle: 'Faturas, parcelamentos e cartões de terceiros',
    content: (
      <>
        <p>Cadastre seus cartões com limite, dia de fechamento e dia de vencimento.</p>
        <div className="space-y-2 mt-2">
          <Step n={1}><strong>Compra à vista no cartão:</strong> selecione o cartão no formulário de transação. A compra vai para a fatura aberta do mês correto automaticamente.</Step>
          <Step n={2}><strong>Parcelamento:</strong> selecione "Parcelar em N×". O sistema gera N transações, cada uma na fatura do mês correspondente, com a última absorvendo o centavo de arredondamento.</Step>
          <Step n={3}><strong>Pagar fatura:</strong> em /cartões, expanda o cartão → expanda a fatura → "Registrar pagamento". Suporta pagamento parcial (split).</Step>
          <Step n={4}><strong>Cartão de terceiro</strong> (ex: cartão do pai): marque "owner_type = terceiro". Compras aparecem no Analytics, mas o pagamento tem opção "Reembolsar [nome]" — só gera saída de caixa se você marcar.</Step>
        </div>
        <Tip>O bloco "Compromissos futuros" no Dashboard mostra as parcelas a vencer nos próximos 12 meses agrupadas por mês, para você se planejar.</Tip>
      </>
    ),
  },
  {
    id: 'accounts',
    icon: Wallet,
    title: 'Contas financeiras',
    subtitle: 'Controle de saldo em contas, carteiras e investimentos',
    content: (
      <>
        <p>Crie contas para cada lugar onde seu dinheiro fica (corrente, poupança, carteira física, investimentos).</p>
        <ul className="space-y-1.5 mt-2 list-none">
          <li className="flex gap-2"><span className="text-accent font-medium shrink-0">Saldo:</span> calculado como <code className="text-xs font-mono">saldo_inicial + receitas - despesas</code> de transações vinculadas</li>
          <li className="flex gap-2"><span className="text-accent font-medium shrink-0">Transferência:</span> entre contas cria um par de transações com transfer_pair_id — não afeta o saldo total</li>
          <li className="flex gap-2"><span className="text-accent font-medium shrink-0">Conta padrão:</span> salva no localStorage, pré-selecionada em novos lançamentos</li>
        </ul>
        <Tip>Use "Migrar transações" para mover o histórico completo de uma conta para outra (ex: ao fechar uma conta e abrir outra).</Tip>
      </>
    ),
  },
  {
    id: 'merchants',
    icon: Store,
    title: 'Estabelecimentos',
    subtitle: 'Organize merchants e evite duplicatas',
    content: (
      <>
        <p>Merchants são as entidades de onde você compra ou recebe. Eles aceleram o lançamento e enriquecem o Analytics.</p>
        <div className="space-y-2 mt-2">
          <Step n={1}>Cada merchant tem <strong>tipo</strong> (negócio, pessoa, empregador, banco, próprio), <strong>categoria padrão</strong> e <strong>cor</strong>.</Step>
          <Step n={2}>Ao escolher um merchant no formulário, a categoria é pré-preenchida automaticamente.</Step>
          <Step n={3}><strong>Mesclar duplicatas:</strong> selecione 2+ merchants → escolha qual nome manter → o sistema transfere todas as transações e recorrências para o destino.</Step>
        </div>
        <Tip>18 merchants globais já vêm pré-configurados (iFood, Uber, Netflix, Nubank, etc.) com categorias e aliases para reconhecimento automático no Quick Entry.</Tip>
      </>
    ),
  },
  {
    id: 'categories',
    icon: Tags,
    title: 'Categorias',
    subtitle: 'Organize seus gastos com categorias personalizadas',
    content: (
      <>
        <p>12 categorias globais já vêm pré-criadas. Você pode criar quantas quiser.</p>
        <ul className="space-y-1.5 mt-2 list-none">
          <li className="flex gap-2"><span className="text-expense font-medium shrink-0">Despesa:</span> aparece nos filtros de despesa e Analytics de gastos</li>
          <li className="flex gap-2"><span className="text-income font-medium shrink-0">Receita:</span> aparece nos filtros de receita e totais de entrada</li>
          <li className="flex gap-2"><span className="text-accent font-medium shrink-0">Ambos:</span> aparece em qualquer tipo de transação</li>
        </ul>
        <Tip>O tipo da categoria de uma recorrência define se ela é despesa ou receita — sem campo separado.</Tip>
      </>
    ),
  },
  {
    id: 'multiuser',
    icon: Users,
    title: 'Acesso multi-usuário',
    subtitle: 'Cada pessoa tem sua conta isolada',
    content: (
      <>
        <p>O Finance Mirror já suporta múltiplos usuários. Cada conta é completamente isolada — ninguém vê os dados de outra pessoa.</p>
        <div className="space-y-2 mt-2">
          <Step n={1}>Compartilhe o link <strong>financecrepaldi.pages.dev</strong> com a pessoa.</Step>
          <Step n={2}>Na tela de login, clique em <strong>"Criar conta"</strong>.</Step>
          <Step n={3}>Preencha nome, e-mail e senha. Um e-mail de confirmação será enviado.</Step>
          <Step n={4}>Após confirmar o e-mail, a pessoa pode entrar e tem sua própria área totalmente separada.</Step>
        </div>
        <div className="flex gap-2 p-3 bg-income/8 border border-income/20 rounded-lg mt-1">
          <ShieldCheck size={14} className="text-income shrink-0 mt-0.5" />
          <span className="text-xs text-text-secondary">
            A segurança é garantida por <strong>Row Level Security (RLS)</strong> diretamente no banco Supabase — nem mesmo uma query direta consegue ver dados de outro usuário.
          </span>
        </div>
      </>
    ),
  },
  {
    id: 'score',
    icon: TrendingUp,
    title: 'Score de estabilidade financeira',
    subtitle: 'Como interpretar seu número de 0 a 100',
    content: (
      <>
        <p>O score é calculado com três dimensões:</p>
        <div className="space-y-2 mt-2">
          <div className="flex items-start gap-2 p-2 bg-background-tertiary/50 rounded">
            <span className="text-accent font-bold text-sm shrink-0">40%</span>
            <div>
              <p className="text-xs font-medium text-text-primary">Comprometimento de renda</p>
              <p className="text-xs text-text-muted">Quanto da sua receita vai para despesas fixas e recorrências</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 bg-background-tertiary/50 rounded">
            <span className="text-accent font-bold text-sm shrink-0">30%</span>
            <div>
              <p className="text-xs font-medium text-text-primary">Variação de gastos</p>
              <p className="text-xs text-text-muted">Quão previsível é o seu padrão de gasto mês a mês</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 bg-background-tertiary/50 rounded">
            <span className="text-accent font-bold text-sm shrink-0">30%</span>
            <div>
              <p className="text-xs font-medium text-text-primary">Controle de impulso</p>
              <p className="text-xs text-text-muted">Proporção de transações sem a tag "impulso"</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
          {[['0–40', 'Atenção', 'bg-expense/15 text-expense'], ['40–70', 'Regular', 'bg-accent/15 text-accent'], ['70–100', 'Saudável', 'bg-income/15 text-income']].map(([range, label, cls]) => (
            <div key={range} className={cn('rounded-lg p-2', cls)}>
              <p className="text-xs font-bold">{range}</p>
              <p className="text-[10px]">{label}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
]

export default function HelpPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Como usar</h1>
        <p className="text-text-secondary text-sm mt-0.5">
          Guia completo de todas as funcionalidades do Finance Mirror
        </p>
      </div>

      <div className="card bg-accent/8 border-accent/20">
        <div className="flex gap-3 items-start">
          <Zap size={18} className="text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary">Comece pelo lançamento rápido</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Pressione <kbd className="bg-background-tertiary border border-border px-1.5 py-0.5 rounded font-mono text-[10px]">K</kbd> em qualquer tela para abrir o Quick Entry. É a forma mais rápida de registrar qualquer transação — basta digitar em texto natural.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {SECTIONS.map((s) => (
          <Accordion key={s.id} section={s} />
        ))}
      </div>

      <p className="text-xs text-text-muted text-center pb-4">
        Finance Mirror · Seu reflexo financeiro comportamental
      </p>
    </div>
  )
}
