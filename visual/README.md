# Finance Mirror — Design System

> **"Seu Reflexo Financeiro."**
> Você não melhora suas finanças quando controla números. Você melhora quando entende seu próprio comportamento.

This is the design system for **Finance Mirror**, a personal-finance product built around *behavior*, not accounting. Where most fintechs promise to "make you rich," Finance Mirror acts as a **mirror of the user's financial habits** — showing where the money goes, surfacing patterns, and building financial self-awareness. The mirror represents clarity; the money represents consequence; together they represent **financial consciousness**.

This folder gives a design agent everything needed to produce on-brand Finance Mirror interfaces and assets — foundations (color, type, spacing, elevation), brand assets (logo, iconography), and a high-fidelity UI kit recreating the product.

---

## Sources

This system was built from materials provided by the team. The reader may not have access, but they are recorded here so you can go deeper if you do:

- **Brand manual** — *Manual Conceitual de Marca e Identidade Visual* (provided as text; the authoritative source for the wine/bege/gold identity).
- **Codebase** — `crepaldifinance/finance-mirror/` (React 18 + TypeScript + Vite + Tailwind + Supabase). Source of truth for product structure, feature set, navigation, Portuguese copy, and value formatting.
- **GitHub repo** — https://github.com/FilipeCrepaldi/financecrepaldi — the same project as the codebase above. **Explore this repository further** to build higher-fidelity Finance Mirror designs: real component implementations, services, and the full Supabase schema live there.
- **Production app** — https://financecrepaldi.pages.dev
- **Visual references** — `assets/mockup_dark.png`, `assets/mockup_light.png`, `assets/mockup_login.png` (brand sheet + dashboard mockups), and `assets/logo.png` (mirror symbol).

> ⚠️ **Note on the codebase theme:** the repository's current `tailwind.config.js` still ships a *legacy* violet/DM-Sans theme (`#7c6af7`, dark blue-black). That is **not** the brand. The **wine + bege rosado + gold / Inter** identity defined in the brand manual and the mockups is the source of truth and is what this design system implements. Treat the codebase as the authority on *structure and copy*, and the brand manual + mockups as the authority on *visuals*.

---

## The Product

**Finance Mirror** is a single web product (responsive, mobile-first feel). Core surfaces, from the codebase:

| Surface | Portuguese label | Purpose |
|---|---|---|
| Dashboard | **Resumo** | Balance, income, expense, % committed, recent transactions, insights, accounts, cards |
| Transactions | **Transações** | Full list + filters; quick-entry parser (`"32 ifood almoço"`) |
| Budgets | **Orçamentos / Planejamento** | Monthly limit per category, progress bars |
| Goals | **Metas** | Savings/spending targets |
| Recurrences | **Recorrências** | Bills & income on schedule, mini calendar |
| Accounts | **Contas** | Checking/savings/cash/investment + transfers |
| Cards | **Cartões** | Credit cards, invoices, installments, third-party cards |
| Analytics | **Relatórios** | Category pie, monthly trend, weekday heatmap, stability score |
| Insights | **Insights** | Behavioral alerts (overspend, spikes, streaks, card limits) |
| Categories | **Categorias** | Custom categories |
| Merchants | **Estabelecimentos** | Merchants as first-class entities |

Key behavioral concepts: **quick entry** (natural-language transaction parsing), **stability score** (0–100), **streaks** (consecutive days without "impulso" tags), and the principle that **credit-card spend is future commitment, not immediate cash outflow**.

---

## CONTENT FUNDAMENTALS

**Language:** Brazilian Portuguese (pt-BR), always. Currency is BRL formatted `R$ 12.340,00` (period thousands, comma decimals, space after `R$`). Dates use ptBR locale — `24 Mai`, `Hoje`, `Ontem`, `Maio de 2024`.

**Voice:** intelligent, elegant, analytical, trustworthy, modern, discreet. **Never** ostentatious, aggressive, flashy, or childish. The system says *"I understand your numbers,"* not *"get rich quick."*

**Person & address:** speaks **to** the user as *você*, warmly but without flattery. Greets by name: *"Olá, João! 👋"*, *"Bem-vindo de volta."* Microcopy is short and direct.

**Casing:** Sentence case for headings and body (*"Aqui está o resumo das suas finanças."*). **UPPERCASE with wide tracking** reserved for small eyebrow labels (*"SEU ESPELHO"*, *"ANÁLISE INTELIGENTE"*, *"SEU REFLEXO FINANCEIRO"*). Buttons are sentence case (*Entrar, Lançar, Ver todas, Criar conta*).

**Tone examples (verbatim from product/mockups):**
- Hero: *"Clareza para cada decisão financeira."* / *"Visualize. Entenda. Transforme."*
- Value props: *"Veja com clareza para onde seu dinheiro vai."* · *"Relatórios e insights para entender seus hábitos."* · *"Defina objetivos e acompanhe sua evolução."*
- Brand line: *"Mais do que números, você vê seus hábitos, entende suas escolhas e transforma seu futuro."*
- Empty state: *"Nenhuma transação ainda. Use o botão Lançar para adicionar."*

**Emoji:** used **sparingly and only as warmth in greetings** (the waving hand `👋` after the user's name). Emoji are **never** used as functional icons, bullets, or category markers — those are always Lucide line icons. One emoji per greeting, max.

**Numbers & data:** show numbers only when they mean something (balance, deltas like `+ 8,5% vs. Abril`, category percentages, `3/12` installments). Avoid decorative stats. Lots of negative space.

---

## VISUAL FOUNDATIONS

**Overall vibe:** premium, calm, "glass floating in a dark wine room." High-end financial software, not a neon crypto app. Dark mode is the *primary* surface; light mode is a first-class alternative that keeps the identity.

**Color:** The signature move is **wine + bege rosado**, deliberately avoiding the blue-green cliché of every other fintech. Wine (`#7B1E3A`) carries maturity and richness *without urgency*; rosa rubi (`#BE4B6B`) adds humanity; gold (`#CDAA5E`) marks premium/achievement and **appears rarely** ("the most elegant luxury is the one that shows up least"). Bege rosado (`#E7CFC4`) replaces pure white — clean *with personality*. Functional finance colors stay conventional for legibility: green income, red-rose expense, petrol-blue info, gold warning. Full tokens in `colors_and_type.css`.

**Type:** **Inter** throughout (the genuine brand font, on Google Fonts). Bold = titles, SemiBold = subtitles & brand weight, Regular = body, Medium = financial values. **Financial values are set in JetBrains Mono with tabular figures** so digits align in columns — a deliberate "data" texture against Inter's UI text. Tight tracking on display/headings (`-0.02em`); wide tracking (`0.14–0.22em`) on uppercase eyebrows.

**Spacing & layout:** base-4 spacing scale. Generous negative space — charts and cards breathe. Sidebar (≈240px) + topbar shell on desktop; bottom tab bar on mobile. Topbar carries the **Lançar** quick-entry action with a `K` shortcut hint.

**Backgrounds:** flat solid surfaces, **no** busy gradients on page backgrounds. Gradients appear only inside *brand objects* — the logo symbol's cristal reflections and the credit-card visual (wine→rubi diagonal with a radial rubi glow). No photographic imagery, no illustration scenes; the logo symbol is the one rich rendered object.

**Corner radii:** 12–16px is the house default (modern, soft). Cards = 16px, buttons/inputs = 12px, chips = 8px, badges = pill. Never sharp, never overly round.

**Cards:** solid `--card` fill, 1px `--border`, 16px radius, light `--shadow-md`. Elevated variants step up the surface (`--card-2`) rather than darkening shadows. **No colored-left-border accent cards.**

**Shadows & elevation:** intentionally light — *"glass floating, never a 2008 video-game button."* Three steps (sm/md/lg) plus a special **gold glow** (`--shadow-glow-gold`) reserved for premium elements. Elevation is communicated more by surface lightening than by heavy drop shadows.

**Borders:** 1px hairlines in low-contrast wine-tinted neutrals (`--border`, `--border-soft`). Focus rings: wine border + 3px translucent wine halo.

**Transparency & blur:** the topbar uses `backdrop-blur` over a translucent background. Active nav items use translucent wine fills (`rgba(123,30,58,0.22)`) rather than solid blocks. Overlays/modals dim with `rgba(0,0,0,0.6)`.

**Iconography:** **Lucide**, outline only, thin stroke (~1.75px), minimalist. Tinted rosa rubi or inherited text color. Never filled, never emoji-as-icon. (See ICONOGRAPHY below.)

**Charts:** soft, low-noise. Line charts with gentle curves; donut/pie for category breakdown (wine→rubi→gold sweep); bar charts for cash flow (green income vs rose expense). Minimal gridlines, lots of air.

**Motion:** quick and refined. `fade-in` (200ms), `slide-up` (250ms, 8px), `slide-in` (200ms). Easing `cubic-bezier(0.16,1,0.3,1)` (ease-out) for entrances. **Hover:** buttons lighten (wine → `#A33150`), ghost items gain an elevated surface, links shift to hover tint — opacity is *not* the primary hover signal. **Press:** subtle scale-down (~0.97). No bounces, no springy overshoot — the brand is discreet.

**Imagery color vibe:** warm, wine-toned, slightly luxurious; if photography is ever introduced it should be warm and low-key, never cool or clinical.

---

## ICONOGRAPHY

- **System:** [Lucide](https://lucide.dev) (the icon set the codebase already uses — `lucide-react` 0.383). Outline, consistent ~1.75px stroke, rounded joins, minimalist.
- **Delivery:** in this design system, load Lucide from CDN (`https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`, then `lucide.createIcons()`), or `lucide-react` in production. No custom icon font or SVG sprite is shipped by the product, so **the CDN Lucide set is the canonical source** — this is a faithful match, not a substitution.
- **Color & weight:** icons inherit text color or take rosa rubi (`#BE4B6B`) as an accent on dark surfaces; muted (`--fg3`) when secondary. Never filled.
- **Canonical mappings** (used across the app and UI kit): `layout-dashboard` Resumo · `arrow-left-right` Transações · `target` Metas · `bar-chart-3` Relatórios · `wallet` Contas · `credit-card` Cartões · `refresh-cw` Recorrências · `tags`/`pie-chart` Categorias · `store` Estabelecimentos · `sparkles` Insights · `trending-up`/`trending-down` Receita/Despesa · `zap` Lançar · `bell` Alertas · `settings` Configurações · `log-out` Sair · `eye` Visão · `brain` Análise · `shield-check` Segurança.
- **Emoji:** not iconography. Allowed only as a warmth accent in greetings (`👋`). Never as a functional symbol.
- **The logo symbol** (two mirrors + `$`) is a rendered brand asset, **not** a line icon — use `assets/logo.png`, never redraw it.

---

## Index — what's in this folder

| Path | What |
|---|---|
| `README.md` | This file — context, content & visual foundations, iconography |
| `SKILL.md` | Agent Skill manifest (downloadable for Claude Code) |
| `colors_and_type.css` | All design tokens — import into any artifact |
| `assets/` | `logo.png` + brand mockups (`mockup_dark.png`, `mockup_light.png`, `mockup_login.png`) |
| `preview/` | Design-system specimen cards (colors, type, spacing, components, brand) |
| `ui_kits/finance-mirror/` | Interactive React recreation of the app — see its own `README.md` |

**UI kits:** `finance-mirror` (the single web product — login, dashboard, transactions, quick-entry).

## CAVEATS / SUBSTITUTIONS

- **Fonts:** Inter and JetBrains Mono are loaded from Google Fonts. Both are the genuine intended families (Inter is named in the brand manual), so this is not a substitution. No `.ttf` files are bundled — if you need offline/embedded fonts, ask and they can be added to `fonts/`.
- **Legacy theme:** the live codebase has not yet been re-skinned to the wine identity (see note above). The UI kit here shows the *intended* rebranded product per the manual + mockups.
