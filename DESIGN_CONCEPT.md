# Visual Design Concept: "Botanical Almanac"

## Direction

Editorial warmth inspired by vintage seed catalogs and botanical field guides. Kinfolk magazine meets a well-designed nursery shop. Intentional, refined, distinctly non-generic.

**Key shift from current design**: Green goes from "dominant everywhere" to "supporting accent". Warm terracotta becomes the action color. Warm neutrals create the foundation. Heavy shadows and pill shapes give way to thin borders and subtle rectangles.

## Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#FAF6F1` | Warm cream page background (replaces green-tinted `#f1f8e9`) |
| Surface | `#FFFFFF` | Cards, modals, inputs |
| Text primary | `#2D2A26` | Body text, headings (warm charcoal, not cold black) |
| Text secondary | `#6B6560` | Labels, hints, inactive navigation |
| Forest green | `#2D5F2D` | Links, secondary buttons, category accents |
| Terracotta | `#C4653A` | Primary CTAs, active tab states, checked items, action highlights |
| Sage | `#8FA78B` | Focus rings, hover backgrounds, subtle accents |
| Border | `#E5DED6` | Card borders, dividers, input borders (warm tan) |
| Highlight | `#E8F0E4` | Hover/selection backgrounds (very subtle green tint) |

## Typography

| Role | Font | Weight | Source |
|------|------|--------|--------|
| Headings (h1-h3) | Playfair Display | 600 | Google Fonts - elegant serif with character |
| Body, UI, buttons | Source Sans 3 | 400/500 | Google Fonts - clean humanist sans |
| Fallback | Segoe UI, sans-serif | - | Current stack, graceful degradation |

### Scale

- h1: 1.8rem desktop / 1.5rem mobile
- h2 (sections): 1.3-1.4rem
- h3 (cards): 1.15rem
- Body: 0.95rem
- Labels/small: 0.8rem

## Shape Language

- **Border-radius**: 6-8px on cards, buttons, inputs (replaces 20-30px pills)
- **Cards**: 1px solid border in warm tan, minimal or no box-shadow
- **Modals**: 16px radius with subtle backdrop blur
- **No hover lifts** (translateY) - use subtle background/shadow changes instead

## Component Design

### Desktop Header
White/cream background. Title in Playfair Display serif. Navigation as clean text tabs with underline active indicator in terracotta. Replaces the heavy solid-green banner with pill buttons.

### Mobile Bottom Navigation
Same 4-5 icon structure. Refined: terracotta 2px line indicator under active tab (instead of background color fill). Slightly smaller labels in Source Sans 3.

### Period Buttons (April / May / June)
Segmented control style: joined buttons with shared border, separated by 1px dividers. Active state fills with terracotta. On mobile (<=600px), breaks into separate individual chips with 6px radius.

### Plant Grid Cards
Thin 1px border, 8px radius, 24px padding. No heavy box-shadow, no hover-lift animation. Category title in Playfair Display serif. The emoji icon stays in the header but loses its colored circle background.

### Plant/Task List Items
Remove the repeated emoji prefix (currently every item shows a seedling emoji via CSS `::before`). Clean checkbox + text only. Checkbox accent-color: terracotta. Subtle bottom border between items.

### Buttons

| Type | Background | Border | Text | Usage |
|------|-----------|--------|------|-------|
| Primary CTA | Terracotta `#C4653A` | none | white | "New Entry", "Save", "Search" |
| Secondary | Forest green `#2D5F2D` | none | white | "Export", "Import" |
| Outline | transparent | 1px forest green | forest green | Data management, less prominent actions |
| Ghost | transparent | 1px dashed border | warm gray | "+ Add Period" |
| Cancel | Cream `#FAF6F1` | 1px warm tan | charcoal | Modal cancel buttons |

All buttons: 6px radius, font-weight 500, Source Sans 3.

### Modals
16px border-radius. Backdrop: semi-transparent warm overlay with 3px blur. Title in Playfair Display with bottom border separator. Buttons aligned right.

### Search Input
Clean 1px border, 6px radius. Focus ring in sage green (`0 0 0 3px rgba(143, 167, 139, 0.2)`). No shadow.

### Journal
Container: white surface, thin border, no shadow. Entry cards: terracotta left-border accent (4px). Empty state: Playfair Display heading, warm tones. Tabs: outlined chips, active fills terracotta.

### Notifications
Success: pale green bg / forest text. Error: pale red bg / red text. Info: pale blue bg / blue text. Warning: pale yellow bg / amber text. All with 6px radius.

## Texture & Atmosphere

- Subtle paper-grain noise overlay on page background (SVG noise filter at 3% opacity via CSS pseudo-element). Adds organic warmth.
- Thin 1px dividers between sections instead of heavy shadows.
- Animations: subtle 0.15s transitions on hover/focus. Fade-in on card render with 8px translateY (reduced from current 20px).

## Mobile Considerations

- Bottom nav is the primary navigation (header hidden)
- Period buttons break from segmented control to individual chips
- Cards go near-edge-to-edge (reduced horizontal padding)
- FAB button for journal uses terracotta with 14px radius
- Touch targets: minimum 44x44px maintained on all interactive elements
- Horizontally scrollable elements where content exceeds viewport width

## What This Replaces

| Aspect | Before | After |
|--------|--------|-------|
| Palette | All-green monochrome | Warm cream + terracotta + forest accents |
| Fonts | Segoe UI system stack | Playfair Display + Source Sans 3 |
| Buttons | 30px pill radius everywhere | 6px rectangles with role-based colors |
| Cards | Heavy box-shadow, hover lift | Thin 1px border, no lift |
| Header | Solid green banner | Clean white bar with text-tab nav |
| Plant items | Emoji prefix on every item | Clean checkbox + text only |
| Active states | Darker green | Terracotta fill |
| Shadows | Heavy `0 3px 10px` | Minimal or thin border only |
