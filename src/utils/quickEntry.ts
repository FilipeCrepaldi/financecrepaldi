import type { MerchantAlias, ParsedEntry, Category } from '@/types'
import { todayISO } from './format'

// ============================================================
// TIPOS DE SUPORTE
// ============================================================

interface AliasWithCategory extends MerchantAlias {
  category?: Category | null
}

// ============================================================
// PATTERNS DE VALOR
// Aceita: 32 | 32.5 | 32,50 | 1.200,50 | 1200.50
// ============================================================

const AMOUNT_RE = /^(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)$/

function parseAmountToken(token: string): number | null {
  const clean = token.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) || n <= 0 ? null : n
}

// ============================================================
// PARSER PRINCIPAL
// Input: "32 ifood almoço"
// ============================================================

export function parseQuickEntry(
  input: string,
  aliases: AliasWithCategory[],
): ParsedEntry | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const tokens = trimmed.split(/\s+/)
  if (tokens.length === 0) return null

  // Valor pode estar no início ou no fim
  let amount: number | null = null
  let textTokens: string[] = []

  if (AMOUNT_RE.test(tokens[0])) {
    amount = parseAmountToken(tokens[0])
    textTokens = tokens.slice(1)
  } else if (AMOUNT_RE.test(tokens[tokens.length - 1])) {
    amount = parseAmountToken(tokens[tokens.length - 1])
    textTokens = tokens.slice(0, -1)
  }

  if (!amount) return null

  const rawText = textTokens.join(' ').toLowerCase()

  // Procura alias que faça match com o texto
  let matchedAlias: AliasWithCategory | null = null
  for (const alias of aliases) {
    if (rawText.includes(alias.pattern.toLowerCase())) {
      matchedAlias = alias
      break
    }
  }

  // Texto sem o nome do merchant vira descrição
  const descriptionText = matchedAlias
    ? rawText.replace(matchedAlias.pattern.toLowerCase(), '').trim()
    : rawText

  return {
    amount,
    merchantRaw: rawText,
    merchantName: matchedAlias?.merchant_name ?? (rawText || null),
    description: descriptionText || null,
    categoryId: matchedAlias?.category_id ?? null,
    date: todayISO(),
    type: 'expense', // default — income pode ser forçado com "+" no início
  }
}

// ============================================================
// SUGESTÃO DE CATEGORIA POR NOME (fallback sem alias)
// ============================================================

const KEYWORD_CATEGORY_MAP: Record<string, string[]> = {
  Alimentação: ['restaurante', 'lanche', 'pizza', 'sushi', 'almoço', 'jantar', 'café', 'padaria', 'mercado', 'supermercado'],
  Transporte: ['gasolina', 'combustível', 'estacionamento', 'ônibus', 'metrô', 'passagem'],
  Saúde: ['farmácia', 'remédio', 'consulta', 'médico', 'dentista', 'exame'],
  Lazer: ['cinema', 'show', 'ingresso', 'bar', 'festa', 'viagem'],
  Educação: ['curso', 'livro', 'faculdade', 'escola', 'material'],
  Assinaturas: ['assinatura', 'mensalidade', 'plano'],
}

export function suggestCategoryFromText(
  text: string,
  categories: Category[],
): string | null {
  const lower = text.toLowerCase()

  for (const [categoryName, keywords] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      const cat = categories.find((c) => c.name === categoryName)
      if (cat) return cat.id
    }
  }

  return null
}
