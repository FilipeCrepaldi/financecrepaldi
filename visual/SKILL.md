---
name: finance-mirror-design
description: Use this skill to generate well-branded interfaces and assets for Finance Mirror, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick orientation
- **README.md** — full brand context, content fundamentals, visual foundations, iconography. Read first.
- **colors_and_type.css** — all design tokens (wine palette, functional colors, dark/light surfaces via `data-theme`, Inter + JetBrains Mono type, radii, shadows, spacing, motion). Import this into any artifact.
- **preview/** — design-system specimen cards (colors, type, spacing, components, brand).
- **assets/** — `logo.png` (mirror symbol), brand mockups (`mockup_dark/light/login.png`).
- **ui_kits/finance-mirror/** — interactive React recreation of the app (login, dashboard, transactions, quick-entry). Lift components from here.

## Non-negotiables
- Wine `#7B1E3A` primary, bege rosado `#E7CFC4` as the "white", gold `#CDAA5E` rare/premium only. Avoid the blue-green fintech cliché.
- Inter for everything; financial values in JetBrains Mono, tabular.
- Lucide outline icons (thin stroke). Emoji only as a greeting accent (`👋`), never as functional icons.
- pt-BR copy, BRL formatting (`R$ 12.340,00`). Tone: intelligent, elegant, discreet — never "get rich quick".
- Soft glass shadows, 12–16px radii, generous negative space. Dark mode is primary.
