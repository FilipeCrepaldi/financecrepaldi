# Finance Mirror — Documentação Completa

> "O extrato bancário é quase um diário psicológico automático."

**Última atualização:** 2026-06-02

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Filosofia do Sistema](#filosofia-do-sistema)
3. [Stack Tecnológica](#stack-tecnológica)
4. [Infraestrutura](#infraestrutura)
5. [Banco de Dados](#banco-de-dados)
6. [Arquitetura do Frontend](#arquitetura-do-frontend)
7. [Funcionalidades implementadas](#funcionalidades-implementadas)
8. [Migrations](#migrations)
9. [Fluxos principais](#fluxos-principais)
10. [O que falta](#o-que-falta)
11. [Variáveis de ambiente](#variáveis-de-ambiente)
12. [Como rodar localmente](#como-rodar-localmente)
13. [Deploy](#deploy)

---

## Visão Geral

**Finance Mirror** é um sistema financeiro pessoal focado em **comportamento**, não em contabilidade. O objetivo não é só registrar gastos — é ser um espelho comportamental: mostrar para onde o dinheiro vai, identificar hábitos, prever problemas e gerar consciência financeira visual.

- **URL de produção:** https://financecrepaldi.pages.dev
- **Repositório:** https://github.com/FilipeCrepaldi/financecrepaldi
- **Backend:** Supabase Cloud (`https://nwgbxpoploewqghqppwh.supabase.co`)
- **Hospedagem:** Cloudflare Pages (deploy automático em `git push` na `main`)

---

## Filosofia do Sistema

- Reduzir fricção ao máximo (quick entry, autocomplete, categorias sugeridas)
- Automatizar categorização (merchants com categoria padrão, aliases)
- Gerar percepção rápida (dashboard + analytics + insights)
- Transformar dados em comportamento observável (score de estabilidade, streaks)
- **Separar caixa de compromisso futuro** (cartão de crédito não é saída imediata)

O sistema deve abrir rápido, funcionar bem no celular, exigir poucos cliques e ter visual moderno e limpo.

---

## Stack Tecnológica

### Frontend

| Tecnologia | Versão | Função |
|---|---|---|
| React | 18.3 | Framework UI |
| TypeScript | 5.4 | Tipagem estática |
| Vite | 5.3 | Build tool e dev server |
| TailwindCSS | 3.4 | Estilização |
| React Router | 6.24 | Roteamento (rotas protegidas + lazy loading) |
| Zustand | 4.5 | Gerenciamento de estado global |
| Recharts | 2.12 | Gráficos (PieChart, LineChart) |
| date-fns | 3.6 | Datas (locale ptBR) |
| Lucide React | 0.383 | Ícones |
| React Hook Form | 7.52 | (instalado, uso atual mínimo — forms manuais) |
| Zod | 3.23 | (instalado, validações ad-hoc) |

### Backend

| Componente | Função |
|---|---|
| Supabase Postgres | Banco de dados relacional |
| Supabase Auth | Autenticação JWT (email + senha) |
| Supabase RLS | Row Level Security — cada user vê só seus dados |
| Supabase Realtime | Disponível, ainda não usado |
| Supabase Storage | Disponível, ainda não usado |

---

## Infraestrutura

| Componente | Serviço | URL |
|---|---|---|
| Frontend | Cloudflare Pages | https://financecrepaldi.pages.dev |
| Backend | Supabase Cloud | https://nwgbxpoploewqghqppwh.supabase.co |
| Repositório | GitHub | https://github.com/FilipeCrepaldi/financecrepaldi |

**Pipeline de deploy:**

```
git push main → GitHub → Cloudflare Pages → npm run build → dist/ → CDN global (~1 min)
```

Variáveis de ambiente configuradas tanto em `.env.local` quanto no Cloudflare Pages → Settings → Variables and Secrets.

---

## Banco de Dados

### Tabelas

#### `profiles`
Extensão de `auth.users`. Criada via trigger `on_auth_user_created` ao registrar.

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid PK | FK para auth.users |
| email | text | |
| full_name | text | |
| avatar_url | text | |
| currency | text | Default `BRL` |

#### `categories`
`user_id = null` → categoria global. 12 globais pré-criadas. Usuários podem criar categorias próprias.

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | null = global |
| name, icon, color | text | |
| is_default | boolean | |
| type | text | `income` / `expense` / `both` |

**Categorias globais:** Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Assinaturas, Compras, Investimentos, Salário, Freelance, Outros.

#### `tags`
Tags comportamentais. 5 globais pré-criadas.

**Tags globais:** impulso, necessário, conforto, crescimento, emergência.

#### `transaction_tags`
N:N entre `transactions` e `tags`.

#### `merchant_aliases`
Patterns para auto-categorização no quick entry (`pattern`, `merchant_name`, `category_id`, `is_global`). 18 aliases globais pré-configurados (iFood, Uber, Netflix, etc).

#### `merchants` *(migração 003)*
Estabelecimentos como entidade própria.

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| name | text | "iFood", "Pecatto", "Leonis" |
| kind | text | `business` / `person` / `employer` / `bank` / `self` (nullable) |
| default_category_id | uuid | Categoria sugerida ao escolher |
| color | text | |
| aliases | jsonb | Reservado (uso futuro: OCR/import) |

Unique constraint `(user_id, lower(name))`.

#### `accounts` *(migração 007)*
Contas financeiras do usuário (corrente, poupança, carteira, investimento).

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| name | text | "Nubank", "Carteira", "C6" |
| kind | text | `checking` / `savings` / `cash` / `investment` |
| initial_balance | numeric | Saldo inicial (histórico) |
| color | text | |
| icon | text | |
| is_active | boolean | |

Saldo calculado em runtime: `initial_balance + Σ(income) - Σ(expense)` das transações vinculadas via `account_id`.

#### `transactions`

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | |
| type | text | `income` / `expense` / `transfer` |
| amount | numeric | Sempre positivo |
| description, notes | text | |
| merchant_name | text | Texto livre (mantido por compat) |
| merchant_id | uuid | FK merchants |
| category_id | uuid | FK categories |
| recurrence_id | uuid | FK recurrences (se gerada por uma) |
| account_id | uuid | FK accounts. null = sem conta vinculada |
| card_id | uuid | FK credit_cards. **null = pago em caixa** |
| invoice_id | uuid | FK card_invoices |
| transfer_pair_id | uuid | Agrupa o par de transações de uma transferência |
| installment_total | int | Total de parcelas (null = à vista) |
| installment_number | int | Número desta parcela (ex: 3) |
| installment_group_id | uuid | Agrupa as N parcelas da mesma compra |
| date | date | |
| is_confirmed | boolean | |

#### `recurrences`

| Campo | Tipo | Descrição |
|---|---|---|
| name | text | |
| merchant_name + merchant_id | | |
| amount | numeric | |
| frequency | text | `daily` / `weekly` / `monthly` / `yearly` |
| next_due_date | date | |
| category_id | uuid | |
| account_id | uuid | FK accounts |
| card_id | uuid | Se recorrência paga via cartão |
| installment_total | int | |
| is_active | boolean | |

**Tipo é inferido da categoria:** `category.type === 'income'` → receita; senão → despesa.

#### `budgets`
Limite mensal por categoria (`amount`, `month`, `year`).

#### `credit_cards` *(migração 004)*

| Campo | Tipo | Descrição |
|---|---|---|
| name | text | "Nubank Roxinho", "Cartão Pai" |
| last_digits | text | 4 dígitos |
| color | text | |
| limit_amount | numeric | `limit` é palavra reservada em SQL |
| closing_day | int (nullable) | Dia padrão de fechamento — null para fechamento variável |
| due_day | int | Dia de vencimento |
| owner_type | text | `self` / `third_party` |
| owner_name | text | Nome do dono se third_party |
| is_active | boolean | |

#### `card_invoices` *(migração 005)*
Faturas de cartão. Geradas automaticamente quando uma compra cai em mês ainda sem fatura.

| Campo | Tipo | Descrição |
|---|---|---|
| card_id | uuid | |
| reference_month | text | `YYYY-MM` (mês do vencimento) |
| closing_date | date | Editável por fatura — cobre fechamento variável |
| due_date | date | |
| total | numeric | Soma cacheada das compras |
| status | text | `open` / `closed` / `paid` |

Unique `(card_id, reference_month)`.

#### `card_invoice_payments` *(migração 005)*
Pagamentos da fatura. Suporta split (paga em 2x sem juros).

| Campo | Tipo | Descrição |
|---|---|---|
| invoice_id | uuid | |
| amount | numeric | >0 |
| paid_at | date | |
| transaction_id | uuid | FK transactions (saída de caixa — nullable para `third_party` sem reembolso) |

Fatura fica `paid` quando `sum(payments.amount) >= total`.

#### `insights`
Alertas/insights comportamentais. Dedup via unique `(user_id, fingerprint)`.

| Campo | Tipo | Descrição |
|---|---|---|
| type | text | `budget_overrun` / `spike` / `recurrence_missed` / `streak` / `card_limit` / `card_commitment` / `card_third_party` / `invoice_due` |
| severity | text | `info` / `warning` / `critical` / `success` |
| title, body | text | |
| meta | jsonb | Dados estruturados |
| is_read, is_dismissed | boolean | |
| fingerprint | text | Chave de dedup |

### Segurança (RLS)

Todas as tabelas têm Row Level Security ativado. Cada user acessa apenas seus próprios dados. Categorias/aliases globais (`user_id = null` ou `is_global = true`) são legíveis por todos os autenticados. Para `card_invoices` e `card_invoice_payments`, a policy checa ownership via join com `credit_cards`.

### Triggers

- `on_auth_user_created` → cria profile automaticamente ao registrar
- `set_updated_at` → atualiza `updated_at` em profiles, recurrences, transactions, budgets, merchants, credit_cards, card_invoices, accounts

---

## Arquitetura do Frontend

### Estrutura de pastas (atual)

```
src/
├── features/
│   ├── dashboard/components/
│   │   └── DashboardPage.tsx                   # Saldo, receita, despesa, blocos integrados
│   ├── transactions/components/
│   │   ├── TransactionsPage.tsx                # Lista + filtros + paginação
│   │   ├── TransactionFilters.tsx
│   │   ├── TransactionList.tsx
│   │   ├── TransactionRow.tsx
│   │   └── TransactionFormModal.tsx            # CRUD + toggle Caixa/Cartão/Conta + parcelamento
│   ├── budgets/components/
│   │   ├── BudgetsPage.tsx
│   │   ├── BudgetCard.tsx
│   │   └── BudgetFormModal.tsx
│   ├── recurrences/components/
│   │   ├── RecurrencesPage.tsx                 # Agrupado: atrasadas / semana / mês / mais tarde / pausadas
│   │   ├── RecurrenceCard.tsx
│   │   ├── RecurrenceFormModal.tsx             # Toggle Despesa/Receita + merchant combobox
│   │   ├── RecurrenceCalendar.tsx              # Mini calendário com dots
│   │   └── UpcomingDueBanner.tsx               # Banner no Dashboard com próximos 3 dias
│   ├── analytics/components/
│   │   ├── AnalyticsPage.tsx                   # Filtro por fonte: todos / caixa / cartão específico
│   │   ├── PeriodSelector.tsx                  # 1m / 3m / 6m / 1a
│   │   ├── StabilityScoreCard.tsx
│   │   ├── CategoryPie.tsx                     # Donut top 8 + Outras
│   │   ├── MonthlyTrend.tsx                    # LineChart receita/despesa/saldo
│   │   ├── WeekdayHeatmap.tsx                  # Grid 7 colunas
│   │   └── TopMerchantsTags.tsx
│   ├── insights/components/
│   │   ├── InsightsPage.tsx
│   │   ├── InsightsBlock.tsx                   # Top 3 por severidade no Dashboard
│   │   └── InsightCard.tsx
│   ├── merchants/components/
│   │   ├── MerchantsPage.tsx                   # Lista + busca + mesclar duplicatas
│   │   └── MerchantEditModal.tsx
│   ├── categories/components/
│   │   └── CategoriesPage.tsx                  # CRUD de categorias customizadas
│   ├── accounts/components/
│   │   ├── AccountsPage.tsx                    # Lista contas + saldo + transferência
│   │   ├── AccountsBlock.tsx                   # Bloco no Dashboard
│   │   ├── AccountEditModal.tsx                # CRUD de conta
│   │   └── TransferModal.tsx                   # Transferência entre contas
│   ├── cards/components/
│   │   ├── CardsPage.tsx                       # Lista expansível: cartão → faturas → detalhes
│   │   ├── CardsBlock.tsx                      # Bloco do Dashboard com cada cartão
│   │   ├── FutureCommitments.tsx               # Bloco do Dashboard — parcelas 12 meses
│   │   ├── CardEditModal.tsx
│   │   └── PaymentModal.tsx                    # Pagamento parcial + reembolso terceiro
│   └── auth/components/
│       ├── LoginPage.tsx
│       └── RegisterPage.tsx
├── components/
│   ├── shared/
│   │   ├── AppLayout.tsx                       # Sidebar + topbar + atalhos K/N
│   │   ├── LoadingScreen.tsx
│   │   ├── MonthSelector.tsx
│   │   ├── QuickEntryBar.tsx                   # Modal "Lançar"
│   │   └── MerchantCombobox.tsx                # Reusável — busca + "+ Cadastrar" inline
│   └── ui/                                     # Componentes shadcn-like
├── hooks/
│   ├── useAuth.ts
│   └── useQuickEntry.ts
├── services/                                   # Comunicação com Supabase
│   ├── supabase.ts                             # Client singleton
│   ├── transactions.ts                         # CRUD + getSummary + createWithInstallments
│   ├── categories.ts                           # CRUD (inclui customizadas)
│   ├── tags.ts
│   ├── budgets.ts
│   ├── recurrences.ts                          # CRUD + markAsPaid + detectSimilar
│   ├── merchants.ts                            # CRUD + merge + findByName
│   ├── cards.ts                                # CRUD + getOrCreateInvoiceForDate + registerPayment
│   ├── accounts.ts                             # CRUD + transfer + listWithBalances + moveAllFrom
│   ├── insights.ts                             # list + generate + 8 regras de detecção
│   └── index.ts
├── store/                                      # Zustand
│   ├── auth.ts
│   ├── transactions.ts
│   ├── budgets.ts
│   ├── recurrences.ts
│   ├── merchants.ts
│   ├── cards.ts                                # cards + invoicesByCard
│   ├── accounts.ts                             # accounts + defaultAccountId
│   ├── insights.ts
│   └── index.ts
├── router/
│   └── index.tsx                               # Rotas protegidas + lazy
├── types/
│   ├── app.ts                                  # Todos os tipos de domínio
│   └── index.ts
├── utils/                                      # format, parser, todayISO, parseAmount, addMonthsISO, etc
└── lib/utils.ts                                # cn() helper Tailwind
```

### Roteamento

Rotas protegidas via `ProtectedRoute` (redireciona para `/login` se não autenticado).

| Rota | Componente | Lazy |
|---|---|---|
| `/` | DashboardPage | ✅ |
| `/transactions` | TransactionsPage | ✅ |
| `/budgets` | BudgetsPage | ✅ |
| `/recurrences` | RecurrencesPage | ✅ |
| `/analytics` | AnalyticsPage | ✅ |
| `/insights` | InsightsPage | ✅ |
| `/merchants` | MerchantsPage | ✅ |
| `/cards` | CardsPage | ✅ |
| `/accounts` | AccountsPage | ✅ |
| `/categories` | CategoriesPage | ✅ |
| `/login`, `/register` | rotas públicas | ✅ |

### Stores (Zustand)

| Store | Estado |
|---|---|
| `useAuthStore` | user, session, profile, signIn/signUp/signOut, fetchProfile |
| `useTransactionStore` | transactions, categories, aliases, tags, selectedMonth/Year, CRUD local + addCategory/updateCategory/removeCategory |
| `useBudgetsStore` | budgets, fetchBudgets, CRUD local |
| `useRecurrencesStore` | recurrences, showInactive, CRUD local |
| `useMerchantsStore` | merchants, fetchMerchants, addMerchant/updateMerchant/applyMerge |
| `useCardsStore` | cards, invoicesByCard, fetchCards/fetchInvoices, upsertInvoice |
| `useAccountsStore` | accounts, defaultAccountId, fetchAccounts, refreshBalances, CRUD local, setDefaultAccount |
| `useInsightsStore` | insights, fetchInsights, generateInsights, markRead, dismiss |

---

## Funcionalidades implementadas

### ✅ Infraestrutura (Fase 1)
- React + TypeScript + Vite + Tailwind, deploy Cloudflare Pages, alias `@/`
- Repositório GitHub conectado, deploy automático em push
- Schema Supabase completo, RLS em todas tabelas, triggers de profile/updated_at
- Seed de 12 categorias e 18 merchant aliases globais

### ✅ Autenticação
- Login/registro com email e senha
- Sessão persistente via Supabase localStorage
- Rotas protegidas com redirect automático
- Profile carregado após login

### ✅ Layout + Atalhos de teclado
- Sidebar responsiva, topbar com botão "Lançar"
- Lazy loading de páginas
- **Atalhos:** `K` → Quick Entry, `N` → Nova transação (ignorados dentro de inputs; visíveis na topbar)

### ✅ Redesign Visual (2026-06)
Substituição completa da identidade visual — zero mudanças funcionais.

| Item | Antes | Depois |
|---|---|---|
| Paleta | Violet `#7c6af7` | Wine `#7B1E3A` · Rubi `#BE4B6B` · Gold `#CDAA5E` · Bege `#E7CFC4` |
| Fontes | DM Sans | Inter + JetBrains Mono |
| Tema | Só dark | Dark (padrão) + Light — toggle no topbar, persistido em `localStorage` |
| Sidebar | Segue tema da página | Sempre dark (`data-theme="dark"` fixo no `<aside>`) |
| Logo | Ícone SVG genérico | Logo própria (`/logo.png`) com fundo transparente |
| Favicon | `icon.svg` (inexistente) | `/logo.png` |
| Variáveis CSS | Classes Tailwind diretas | Canais RGB (`rgb(var(--bg-rgb) / <alpha>)`) — permite opacity modifiers + switch dark/light |
| Cores legado | Espalhadas em 20+ arquivos | Eliminadas — fallbacks padronizados: `#7B1E3A` (funcional) · `#CDAA5E` (tags) |

### ✅ Dashboard
- Cards de resumo: saldo, receitas, despesas, % comprometido
- **Compras no cartão NÃO somam no saldo** — aparecem em "Compromissos cartão"
- Lista de transações recentes
- Blocos integrados (em ordem): `UpcomingDueBanner`, `InsightsBlock`, `AccountsBlock`, `CardsBlock`, `FutureCommitments`

### ✅ Quick Entry
- Parser de texto natural: `"32 ifood almoço"` → valor + merchant + descrição
- Merchant matching via aliases globais/customizados
- Fallback de categoria por palavras-chave
- Preview em tempo real, salvar com Enter

### ✅ Transações (Fase 2)
- Lista completa com filtros (mês, tipo, categoria, busca textual)
- CRUD via `TransactionFormModal`
- Tags comportamentais (adicionar/remover, sincroniza N:N)
- Toggle visual **Caixa / Cartão** (só para despesas)
- Selector de cartão com cor + dígitos + chip "3º" para terceiros
- Selector de conta (receitas e despesas sem cartão)
- Alocação automática em fatura ao salvar compra de cartão

### ✅ Orçamentos (Fase 3)
- CRUD de orçamentos por categoria + mês/ano
- Barra de progresso de gasto vs limite
- Alertas visuais ao atingir 80% / 100%
- Cards de categoria com gasto atual

### ✅ Recorrências (Fase 4)
- CRUD com toggle **Despesa / Receita** (tipo inferido da categoria)
- Frequências: diária, semanal, mensal, anual
- Visual diferenciado para receita: ícone `ArrowDownLeft`, valor em verde com `+`, botão "Confirmar recebimento"
- Calendário mini com dots dos próximos vencimentos
- Botão "Marcar pago/Confirmar recebimento" gera transação + avança `next_due_date`
- Auto-detect de padrão: nova transação com merchant já gasto ≥2x em 90d sugere virar recorrência
- Banner no Dashboard com vencimentos dos próximos 3 dias (botões "Pagar" / "Receber")

### ✅ Analytics (Fase 5)
- **Filtro de fonte:** Todos / Só caixa / cartão específico (filtra todos os gráficos)
- Period selector: 1m / 3m / 6m / 1a
- Gráfico de pizza: gastos por categoria (top 8 + "Outras")
- Linha temporal: receita/despesa/saldo por mês
- Heatmap: gastos por dia da semana
- Top merchants + top tags
- **Score de estabilidade** (0-100): 40% comprometimento + 30% variação + 30% impulso

### ✅ Insights (Fase 6)
- Bloco no Dashboard (top 3 por severidade) + página dedicada
- Persistidos no banco com `mark as read` e `dismiss`
- Geração automática no login após `fetchInsights`
- 8 regras de detecção:
  - **budget_overrun:** 80% warning, 100% critical
  - **spike:** despesa 1.5× acima da média 3M, base ≥ R$50
  - **recurrence_missed:** vencimento ≥ 7 dias atrás
  - **streak:** dias consecutivos sem tag "impulso" (milestones 7/14/30)
  - **card_limit:** limite usado ≥ 80% (warning) / ≥ 100% (critical)
  - **card_commitment:** parcelas a vencer em 6 meses ≥ R$500
  - **card_third_party:** uso do mês em cartão emprestado
  - **invoice_due:** fatura vencendo em ≤ 3 dias com saldo a pagar
- Badge de não lidos no nav lateral
- Dedup via fingerprint único `(user_id, fingerprint)`

### ✅ Estabelecimentos (Aditivo PR 1)
- Tabela `merchants` com kind, default_category_id, color
- Combobox no form de transação e recorrência: busca + "+ Cadastrar" inline
- Página `/merchants` com lista, busca, edição inline
- **Mesclar duplicatas:** seleciona 2+ → escolhe destino → unifica (transfere transactions/recurrences vinculadas + atualiza merchant_name)
- Seed automático na migração: cria merchants a partir dos `merchant_name` distintos existentes

### ✅ Cartões de crédito (Aditivo PR 2 + PR 3 — completo)
- Tabela `credit_cards` (limite, fechamento, vencimento, owner_type)
- Tabela `card_invoices` (uma por mês de referência, status open/closed/paid)
- Tabela `card_invoice_payments` (suporta split — paga R$X dia 20 + R$Y dia 5)
- Compra em data D atribuída automaticamente à fatura cujo `closing_date >= D`
- **Fechamento variável:** `closing_day` nullable no cartão; cada fatura tem `closing_date` própria editável
- **Cartão de terceiro:** `owner_type='third_party'` + `owner_name`. Compras contam no Analytics, mas pagamento tem checkbox "Reembolsar [nome]"
- Compras com `card_id != null` **não somam no saldo do mês** — aparecem em `cardCommitted`
- Página `/cards` expansível: cartão → faturas → compras com indicador parcela (`3/12`) + pagamentos
- `PaymentModal`: registra pagamento total ou parcial; gera transação de despesa linkada
- **Parcelamento:** campo "Parcelar em N×" no form (preset 1/2/3/4/6/10/12 + custom até 36); gera N transações com `installment_group_id`, cada uma na fatura do mês correto. Última parcela absorve arredondamento
- **Bloco "Compromissos futuros"** no Dashboard: agrupa faturas não pagas dos próximos 12 meses por mês, mostra valor remanescente
- Bloco no Dashboard com cada cartão: fatura aberta, restante a pagar, % do limite

### ✅ Contas financeiras
- Tabela `accounts` com kind (checking/savings/cash/investment), initial_balance, color, icon
- Saldo calculado em runtime: `initial_balance + Σ receitas - Σ despesas` vinculadas
- CRUD completo via `/accounts` com modal de criação/edição
- **Transferência entre contas:** `TransferModal` cria par de transações com mesmo `transfer_pair_id` (os pares são ignorados nos cálculos de receita/despesa do mês)
- `moveAllFrom()` — migra todas as transações/recorrências de uma conta para outra
- Selector de conta no formulário de transação (receitas e despesas sem cartão)
- Conta padrão persistida no localStorage
- **Bloco no Dashboard** (`AccountsBlock`): grid com cada conta ativa, saldo total, botão de transferência

### ✅ Categorias customizadas
- Usuários podem criar categorias próprias com nome, emoji, tipo e cor
- Página `/categories` com seções separadas: "Minhas categorias" (CRUD inline) + "Categorias padrão" (somente leitura)
- Edição e exclusão com confirmação (protege contra FK de transações vinculadas)
- Categorias criadas aparecem automaticamente nos dropdowns de todos os formulários

### ✅ Tipagem
- Todos os tipos em `src/types/app.ts`
- Tipos de formulários, async state, dashboard summary
- Zero erros de TypeScript

---

## Migrations

Em `supabase/migrations/`, aplicar na ordem no SQL Editor (todas idempotentes):

| # | Arquivo | O que faz |
|---|---|---|
| 0 | (schema inicial) | profiles, categories, transactions, recurrences, budgets, tags, merchant_aliases — aplicado manualmente |
| 001 | `001_global_tags.sql` | Seed das 5 tags globais comportamentais |
| 002 | `002_insights.sql` | Tabela `insights` + RLS + fingerprint único |
| 003 | `003_merchants.sql` | Tabela `merchants` + FK `merchant_id` em transactions/recurrences + seed automático |
| 004 | `004_credit_cards.sql` | Tabela `credit_cards` + RLS + constraints |
| 005 | `005_card_invoices.sql` | Tabelas `card_invoices` e `card_invoice_payments` + RLS via ownership |
| 006 | `006_transactions_card_cols.sql` | Adiciona `card_id`, `invoice_id`, `installment_*` em transactions; `card_id` + `installment_total` em recurrences |
| 007 | `007_accounts.sql` | Tabela `accounts` + FK `account_id` em transactions/recurrences + `transfer_pair_id` em transactions + RLS |

---

## Fluxos principais

### Autenticação

```
Usuário acessa URL
  → AuthProvider em main.tsx inicializa Supabase
  → supabase.auth.getSession()
  → Se sessão: fetchProfile + fetchCategories + fetchAliases + fetchTags
              + fetchRecurrences + fetchMerchants + fetchCards + fetchAccounts
              + fetchInsights → generateInsights (background)
  → Sem sessão: redireciona /login
```

### Quick Entry

```
"K" ou botão Lançar → modal
  → digita "32 ifood almoço"
  → parser identifica valor=32, merchant="ifood", descrição="almoço"
  → alias "ifood" → categoria "Alimentação"
  → preview: -R$32,00 · iFood · almoço · [Alimentação]
  → Enter → transactionsService.create
  → store atualiza
  → modal fecha
```

### Lançar compra no cartão (à vista)

```
Form de transação (ou atalho N)
  → Tipo: Despesa → Toggle "Pago com" = Cartão → Selecionar cartão
  → Parcelar em: À vista (1×)
  → handleSubmit:
      cardsService.getOrCreateInvoiceForDate(card, date)
      transactionsService.create(payload, { invoice_id })
      cardsService.recalculateTotal(invoice_id)
  → Saldo do mês NÃO muda — aparece em cardCommitted
```

### Lançar compra parcelada

```
Form de transação
  → Tipo: Despesa → Cartão → Parcelar em: 6×
  → handleSubmit detecta installment_total > 1:
      transactionsService.createWithInstallments(userId, payload, card)
        → para k=1..6:
            date_k = data + (k-1) meses
            invoice_k = getOrCreateInvoiceForDate(card, date_k)
            insere transaction com installment_number=k, installment_group_id=uuid
        → última parcela absorve resíduo de arredondamento
        → recalculate total de cada fatura afetada
  → 6 transações criadas, cada uma na fatura do mês correspondente
```

### Transferência entre contas

```
/accounts → "Transferir" (botão, disponível quando ≥2 contas ativas)
  → TransferModal: conta origem, conta destino, valor, data
  → accountsService.transfer():
      cria transaction (expense + account_id=from + transfer_pair_id=uuid)
      cria transaction (income  + account_id=to   + transfer_pair_id=uuid)
  → getSummary ignora transactions com transfer_pair_id
  → Saldo de cada conta atualiza; saldo total do mês não muda
```

### Pagar fatura (cartão próprio)

```
/cards → expandir cartão → expandir fatura → "Registrar pagamento"
  → PaymentModal: valor (default = restante), data
  → registerPayment:
      cria transaction (expense, sai do caixa)
      cria card_invoice_payment com transaction_id
      se sum(payments) >= invoice.total → status='paid'
  → Saldo do mês desce no valor pago
```

### Pagar fatura (cartão de terceiro)

```
/cards → cartão Pai → fatura → "Registrar pagamento"
  → PaymentModal mostra checkbox "Reembolsar [Pai]"
  → Se marcado: gera transação "Reembolso fatura Cartão Pai (Leonis)" — sai do caixa
  → Se desmarcado: registra payment sem mexer no caixa (ele paga, você só registra)
  → Fatura quita normalmente quando sum(payments) >= total
```

### Deploy

```
git add . && git commit && git push
  → GitHub
  → Cloudflare Pages detecta mudança na main
  → npm run build → dist/
  → CDN global atualizada (~1 min)
```

---

## O que falta

### 🟡 Funcionalidades avançadas

- **Importador CSV** de extratos bancários
- **OCR** de comprovantes
- **Open Finance** (integração bancária)
- **IA comportamental:** "seus gastos aumentam nos fins de semana"
- **Multi-moeda**
- **Exportar dados** (CSV / PDF)
- **Merchant aliases customizados pela UI** (hoje só via SQL)
- **Rotativo com juros** (hoje pagamento parcial é split planejado, sem juros)

### 🟡 Melhorias técnicas

- Testes unitários (utils, parser, serviços)
- Realtime (atualização automática ao adicionar transação em outra aba)
- PWA (instalar como app no celular)
- Offline support

---

## Variáveis de ambiente

Arquivo `.env.local` (não commitado):

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publishable
```

Mesmas variáveis configuradas no Cloudflare Pages → Settings → Variables and Secrets.

---

## Como rodar localmente

### Pré-requisitos
- Node.js 18+
- npm
- (Windows) PowerShell — usar `npm.cmd` se execution policy estiver restrita, ou rodar `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` uma vez

### Comandos

```powershell
cd "c:\Users\Filipe Crepaldi\OneDrive\Desktop\crepaldifinance\finance-mirror"
npm install              # primeira vez
npm.cmd run dev          # servidor de dev em http://localhost:5173
npm.cmd run typecheck    # validação TypeScript
npm.cmd run build        # build de produção em dist/
```

Para deixar o servidor de dev rodando enquanto trabalha:
- Terminal 1: `npm.cmd run dev` (dedicado, hot-reload automático)
- Terminal 2 (split): para git, comandos avulsos

### Aplicar migrations no Supabase

Antes de testar localmente uma feature que dependa de mudanças de schema, abrir Supabase SQL Editor → colar o conteúdo da migration correspondente → executar. Todas são idempotentes (pode rodar várias vezes).

---

## Deploy

### Publicar atualização

```powershell
git add .
git commit -m "descrição da mudança"
git push
# Cloudflare Pages faz o deploy automaticamente em ~1 min
```

### Verificar tipos antes do push

```powershell
npm.cmd run typecheck
# Deve retornar sem erros
```

### Aplicar migrations em produção

Migrations não rodam automaticamente no deploy do frontend. Antes de fazer push de uma feature que mude schema, aplicar manualmente no Supabase SQL Editor (o mesmo banco serve dev e prod).

---

*Documentação atualizada em 2026-06-02.*
