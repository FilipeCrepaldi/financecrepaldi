# Aditivo — Estabelecimentos + Cartão de Crédito

> Aditivo conceitual ao [finance-mirror-docs (1).md](./finance-mirror-docs%20(1).md). Define duas funcionalidades novas que estendem o modelo atual **sem quebrar nada**: cadastro de Estabelecimentos como entidade própria e controle estruturado de Cartões de Crédito com faturas, parcelas e pagamentos parciais.

**Status:** conceito aprovado, implementação dividida em 3 PRs sequenciais.

**Data do conceito:** 2026-05-18

---

## Índice

1. [Motivação](#motivação)
2. [Estabelecimentos (Merchants)](#estabelecimentos-merchants)
3. [Cartão de Crédito](#cartão-de-crédito)
4. [Modelo de dados completo](#modelo-de-dados-completo)
5. [Migração e seed automático](#migração-e-seed-automático)
6. [Plano de implementação](#plano-de-implementação)
7. [Não escopo (ficam fora)](#não-escopo-ficam-fora)

---

## Motivação

Dois problemas reais identificados durante uso:

**1. Estabelecimento como texto livre vira ruído.** Hoje `merchant_name` é texto digitado a cada lançamento. Não há autocomplete, não há categoria sugerida, não há agregação confiável. Inspeção do banco mostrou 25+ merchant_names já cadastrados em transações/recorrências — incluindo erros como "Recarga Bilhete" lançado como merchant.

**2. Cartão de crédito é o maior pano da gestão financeira do usuário.** Usuário tem 2 cartões ativos (próprio + do pai, em transição) e se atrapalha nos lançamentos misturados. Hoje o cartão do pai aparece de forma confusa: a transação `R$900 "Cartão de Crédito 2/2"` apontando para merchant "Leonis Agripino dos Santos" é na verdade o pagamento parcial de uma fatura; a recorrência `PS Plus R$30` apontando para Leonis é na verdade uma compra recorrente no cartão dele. O modelo certo separa **compra** de **pagamento da fatura**.

O aditivo resolve os dois problemas mantendo retrocompatibilidade total — nada do schema atual é removido, apenas estendido.

---

## Estabelecimentos (Merchants)

### Conceito

Promover merchant de texto livre para entidade de primeira classe. Cada usuário tem sua própria base de estabelecimentos. Ao lançar uma transação/recorrência, o usuário escolhe da lista (com autocomplete) ou cadastra inline. Estabelecimento carrega categoria padrão e ícone visual.

### Tabela `merchants`

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK profiles |
| name | text | Nome do estabelecimento ("iFood", "Pecatto", "Leonis") |
| kind | text | `business` \| `person` \| `employer` \| `bank` \| `self` (opcional) |
| default_category_id | uuid | FK categories (sugestão ao escolher) |
| color | text | Cor hex (opcional, cai pra cor da categoria) |
| aliases | jsonb | Array de strings alternativas (futuro: OCR/import) |
| created_at | timestamptz | |

`kind` é opcional mas habilita analytics úteis: "R$ X/mês para pessoas próximas", "recebido do empregador".

### Mudanças em tabelas existentes

`transactions` e `recurrences` ganham:
- `merchant_id uuid` (FK nullable — mantém `merchant_name text` por compat e busca rápida)

### UX

**No form de transação/recorrência:**
- Campo "Estabelecimento" vira combobox com search.
- Lista os merchants do usuário, mais relevantes no topo (recentes/frequentes).
- Ao escolher → categoria padrão preenche automaticamente (editável).
- Última linha fixa: **"+ Cadastrar '[texto digitado]'"** → abre mini-modal com nome + categoria padrão opcional + kind. Salva e seleciona.

**Página `/merchants`:**
- Lista com busca, edição inline de nome/categoria/kind/cor.
- Botão "Mesclar duplicatas" (ex: "Cacau Show" + "cacau show" → unifica).
- Exclusão libera as transações vinculadas (merchant_id vira null, merchant_name preservado).

---

## Cartão de Crédito

### Princípio fundamental

**Compra no cartão ≠ saída de caixa.** Compra no cartão é compromisso futuro. A saída de caixa só acontece quando a fatura é paga. Isso muda toda a apresentação:

- Compras no cartão **não somam no saldo do mês**. Aparecem em bloco separado ("Fatura em aberto").
- Pagamento de fatura é **uma transação real** (saída do caixa) linkada à fatura.
- Parcelas: cada parcela aparece na fatura do mês correspondente (1 compra de 12x = 12 entradas, uma por mês).

### Cartão de terceiro

Cartões de terceiro (`owner_type='third_party'`) têm tratamento diferente:
- Compras contam no seu Analytics/orçamento (você gastou, é seu hábito).
- Pagamento da fatura **gera transação de reembolso ao dono** (saída do seu caixa transferida pra ele).
- Insight extra: "Você usou R$ X no cartão do [nome] este mês" — clareza da dependência.

### Fechamento variável

Realidade dos cartões brasileiros: fechamento oscila por feriado/final de semana. Modelo:
- `credit_cards.closing_day` é só **default/sugestão** (pode ser null).
- Cada `card_invoices.closing_date` é **real e editável** pelo usuário.
- Botão "Fechar fatura agora" cria fatura nova quando o usuário quiser fechar antes do esperado.
- Compra é atribuída à primeira fatura aberta cuja `closing_date >= data_compra`.

### Pagamento parcial / em duas partes

O usuário paga a fatura do cartão do pai em **2 partes** (dia 20 + 5º dia útil). Não é rotativo com juros — é pagamento planejado dividido. Modelo:
- Tabela `card_invoice_payments` armazena lista de pagamentos por fatura.
- Cada pagamento referencia a transação real de saída de caixa.
- Fatura fica `paid` quando `sum(payments.amount) >= invoice.total`.

---

## Modelo de dados completo

### Novas tabelas

**`merchants`** — ver seção [Estabelecimentos](#estabelecimentos-merchants).

**`credit_cards`**

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK profiles |
| name | text | "Nubank Roxinho", "Cartão Pai" |
| last_digits | text | Últimos 4 dígitos |
| color | text | Cor hex (visual no UI) |
| limit | numeric | Limite de crédito |
| closing_day | int | Dia padrão de fechamento (nullable) |
| due_day | int | Dia de vencimento |
| owner_type | text | `self` \| `third_party` |
| owner_name | text | Nome do dono se `third_party` |
| is_active | boolean | |
| created_at | timestamptz | |

**`card_invoices`**

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| card_id | uuid | FK credit_cards |
| reference_month | text | "2026-06" |
| closing_date | date | Data real de fechamento (editável) |
| due_date | date | Vencimento |
| total | numeric | Soma das compras (calculado/cached) |
| status | text | `open` \| `closed` \| `paid` |
| created_at | timestamptz | |

**`card_invoice_payments`**

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | PK |
| invoice_id | uuid | FK card_invoices |
| amount | numeric | Valor do pagamento |
| paid_at | date | Data do pagamento |
| transaction_id | uuid | FK transactions (link com saída de caixa) |

### Mudanças em tabelas existentes

**`transactions`** ganha:
- `merchant_id uuid` — FK merchants
- `card_id uuid` — FK credit_cards (null = pago em caixa)
- `invoice_id uuid` — FK card_invoices (fatura que essa compra integra)
- `installment_total int` — total de parcelas (1 = à vista)
- `installment_number int` — número desta parcela (ex: 3 de 12)
- `installment_group_id uuid` — agrupa as N parcelas da mesma compra

**`recurrences`** ganha:
- `merchant_id uuid` — FK merchants
- `card_id uuid` — FK credit_cards (recorrência paga no cartão)
- `installment_total int` — se a recorrência simula parcelamento

### Regras de cálculo

- Compra na data D no cartão C → atribuída à fatura cujo `closing_date >= D` (a próxima aberta).
- Parcelas: gera N transações com mesmo `installment_group_id`. Parcela K vai pra fatura cujo `reference_month = closing_month + (K-1) meses`.
- Pagamento de fatura (cartão `self`) → cria transação de saída, anexa em `card_invoice_payments.transaction_id`.
- Pagamento de fatura (cartão `third_party`) → opção 1: marca paga sem caixa; opção 2: gera transação de "Reembolso ao [dono]" (escolha no momento).
- Saldo do mês (Dashboard/Analytics) ignora transações com `card_id != null` — elas aparecem em bloco separado de "Compromissos cartão".

---

## Migração e seed automático

A migration popula automaticamente os novos modelos com base no que já existe — usuário não precisa recadastrar nada.

### Seed de merchants

Para cada `merchant_name` distinto presente em `transactions` ou `recurrences` do usuário:
- Cria registro em `merchants` com `name = merchant_name`.
- `default_category_id` = categoria mais frequente daquele merchant nas transações existentes.
- `kind` heurístico (default `business`; nomes próprios detectáveis → `person`; "Araújo Negociações" → `employer`; "Nubank"/"Caixa" → `bank`).
- Atualiza `transactions.merchant_id` e `recurrences.merchant_id` ligando ao novo registro.

### Cartões do usuário

A migration cria os 2 cartões com os dados confirmados:

**Cartão Roxo (próprio):**
- name: a definir na UI ou pré-popular
- last_digits: 2982
- color: roxo
- closing_day: 17 (mas editável por fatura)
- due_day: 24
- owner_type: self

**Cartão Laranja (Leonis — pai):**
- name: "Cartão Pai (Leonis)"
- last_digits: 2990
- color: laranja
- closing_day: null (variável, sem default)
- due_day: 24
- owner_type: third_party
- owner_name: "Leonis Agripino dos Santos"

### Migração das transações do Leonis

A transação `R$900 "Cartão de Crédito 2/2"` com merchant Leonis é convertida em **pagamento parcial** da fatura correspondente do cartão Leonis. A descrição "2/2" indica que existe (ou existiu) uma "1/2" — a migration tenta detectar e linkar ambas como pagamentos da mesma fatura.

A recorrência `PS Plus R$30` com merchant Leonis é convertida em **compra recorrente no cartão Leonis**. O merchant da recorrência muda para "Sony PlayStation" (criado novo) ou similar a confirmar com usuário. `card_id` aponta para o cartão Leonis.

### Limpezas que NÃO acontecem

- "Recarga Bilhete" como merchant é mantido (decisão do usuário — faz sentido como está).
- Categorização frouxa (13 transações como "Outros") fica como está — tema pra fase futura de gerência de categorias customizadas.

---

## Plano de implementação

3 PRs sequenciais. Cada um é deployável e testável isoladamente.

### PR 1 — Merchants

**Migration `003_merchants.sql`:**
- Cria tabela `merchants` + RLS + indexes.
- Adiciona `merchant_id` em `transactions` e `recurrences`.
- Seed automático dos merchant_names existentes.

**Frontend:**
- Types em `src/types/app.ts`.
- Service `src/services/merchants.ts` (CRUD + busca).
- Store `src/store/merchants.ts` (lista + filtros).
- Combobox de merchant no `TransactionFormModal` e `RecurrenceFormModal` (com "+ Cadastrar" inline).
- Página `/merchants` simples (lista, editar, mesclar duplicatas).
- Sugestão de categoria padrão ao escolher merchant.

**Critério de aceitação:** lançar transação escolhendo merchant existente, criar merchant novo inline, mesclar duplicatas. Typecheck passa.

### PR 2 — Cartões (base)

**Migrations:**
- `004_credit_cards.sql` — tabela credit_cards + RLS.
- `005_card_invoices.sql` — tabelas card_invoices, card_invoice_payments + RLS.
- `006_transactions_card_cols.sql` — adiciona card_id, invoice_id, installment_* em transactions/recurrences.
- `007_seed_user_cards.sql` — cria os 2 cartões do usuário + migra Leonis.

**Frontend:**
- Service `src/services/cards.ts` (CRUD cartões + faturas + pagamentos + geração automática de fatura).
- Store `src/store/cards.ts`.
- Form de transação ganha toggle "Pago com: Caixa / Cartão" + selector visual de cartão.
- Bloco "Cartões" no Dashboard (1 card por cartão: limite usado, fatura atual, próximo vencimento).
- Página `/cards` (lista de cartões → detalhe com faturas abertas/fechadas/pagas).
- Detalhe de fatura: lista de compras + botão "Registrar pagamento" (aceita valor parcial).

**Crit. aceitação:** lançar compra no cartão, ver fatura formando, pagar fatura em 2 partes, ver saldo do mês não duplicar.

### PR 3 — Cartões (parcelas + UI completa + insights)

**Funcionalidades:**
- Parcelamento: campo "Parcelar em N x" no form de cartão; geração das N transações com installment_group_id.
- Visualização de parcelas: indicador "3/12" no detalhe da fatura; bloco "Compromissos futuros" no Dashboard.
- Insights novos:
  - "Limite do [cartão] em 80%"
  - "Você comprometeu R$X em parcelas nos próximos 6 meses"
  - "Uso do cartão do Pai este mês: R$X" (clareza da dependência)
  - "Fatura do [cartão] vence em 3 dias, R$X restante a pagar"
- Filtro por cartão no Analytics.

**Crit. aceitação:** parcelar uma compra de 12x e ver as 12 entradas distribuídas; insight de limite dispara em teste.

---

## Não escopo (ficam fora)

Itens conscientes que **não** entram nessa rodada:

- **Rotativo com juros.** Pagamento parcial é só split planejado, sem juros. Se vier a precisar (atraso, mínimo), vira aditivo futuro.
- **Multi-moeda no cartão.** Compras em USD/EUR ficam como BRL (valor que o cartão cobrou). Conversão real fica pra fase futura.
- **Importação OFX/CSV do extrato do cartão.** Lançamento continua manual. Importação fica pra Fase 7.
- **Categorias customizadas.** Apesar de identificada como dor (13 transações em "Outros"), vira fase própria — não bagunça esse aditivo.
- **Cashback / pontos.** Sem modelagem de programa de fidelidade.

---

*Aditivo gerado em 2026-05-18. Atualizar conforme as 3 PRs forem entregues e ajustes surgirem na implementação real.*
