# DESIGN.md: Obsidian & Amber

Zain's competitive-programming journal. Direction: **Raycast × Revolut Metal × Apple Pro**. A dark obsidian instrument
panel: hairline cards with a top specular edge, one amber signal, precise type, numbers set in tabular figures.
Jekyll 3.10 + one stylesheet (`assets/css/style.css`) + vanilla JS. This file is the contract; the stylesheet's
`:root` token block implements it.

## 1. Principles

1. **One signal colour.** Amber means progress toward 1800 and nothing else: the rating-progress bar, the climb
   step-line (and the gradient under it), peak heatmap cells. Never on buttons, links, tags, headings or badges.
2. **Light comes from above.** A faint top spotlight on the canvas and a 1px inset highlight on every card. No drop
   shadows on dark, no glows, no gradients except the spotlight and the amber fill under the climb line.
3. **Monochrome everything else.** Zinc greys, white, hairlines. Status is shape and wording, never hue.
4. **Real data only.** Goal 1800. Hardest problem solved independently: 1300 (4C). He has **no Codeforces rating**;
   never show 1300 (or any number) as "rating", "current" or "my rating".
5. **Accessible by default.** WCAG 2.2 AA in both themes, visible focus, no single-key global shortcuts (2.1.4),
   reduced motion honoured everywhere.

## 2. Palette

### Primitives

| Name | Hex | Use |
|---|---|---|
| obsidian | `#09090B` | dark canvas; light-theme text; text on white pill |
| graphite | `#101013` | dark card |
| graphite-2 | `#16161A` | dark raised field / hover row |
| snow | `#FAFAFA` | dark text; light canvas |
| white | `#FFFFFF` | pill CTA; light card |
| zinc-400 | `#A1A1AA` | dark secondary text |
| zinc-450 | `#8A8A93` | dark labels (AA-safe replacement for zinc-500 at 12px) |
| zinc-500 | `#71717A` | light labels; dark *non-text* only |
| zinc-600 | `#52525B` | light secondary text |
| amber | `#F59E0B` | dark signal |
| amber-deep | `#B45309` | light signal (text and lines) |

### Semantic tokens (dark is the default `:root`)

| Token | Dark (default) | Light (`[data-theme="light"]`) | Contrast intent |
|---|---|---|---|
| `--bg` | `#09090B` | `#FAFAFA` | canvas |
| `--spot` | `rgb(255 255 255 / .06)` | `rgb(9 9 11 / .035)` | top spotlight tint |
| `--tile` | `#101013` | `#FFFFFF` | cards, panels |
| `--tile-2` | `#16161A` | `#F4F4F5` | raised field, row hover base |
| `--text` | `#FAFAFA` | `#09090B` | 19.1:1 / 19.9:1 |
| `--text-2` | `#A1A1AA` | `#52525B` | 7.4:1 on card / 7.4:1 on canvas |
| `--text-3` (labels) | `#8A8A93` | `#71717A` | 5.6:1 on card / 4.8:1 on white |
| `--hair` | `rgb(255 255 255 / .08)` | `rgb(9 9 11 / .08)` | card borders, dividers (decorative) |
| `--hair-2` | `rgb(255 255 255 / .14)` | `rgb(9 9 11 / .14)` | control borders, dashed chart rules |
| `--spec` | `inset 0 1px 0 rgb(255 255 255 / .06)` | `inset 0 1px 0 rgb(255 255 255 / .9), 0 1px 2px rgb(9 9 11 / .04)` | top specular |
| `--fill` | `rgb(255 255 255 / .04)` | `rgb(9 9 11 / .04)` | keycaps, pills, hover |
| `--fill-2` | `rgb(255 255 255 / .07)` | `rgb(9 9 11 / .07)` | pressed, selected tab |
| `--field` | `rgb(255 255 255 / .38)` | `rgb(9 9 11 / .45)` | outline marks (≥3:1 graphics) |
| `--accent` | `#F59E0B` | `#B45309` | 8.8:1 on card / 5.0:1 on white: may carry text |
| `--accent-display` | `#F59E0B` | `#B45309` | climb line, progress bar (≥3:1) |
| `--accent-fill` | `#FFFFFF` | `#09090B` | **the pill CTA**, not amber |
| `--on-accent-fill` | `#09090B` | `#FAFAFA` | text on pill CTA |
| `--amber-wash-top` | `rgb(245 158 11 / .22)` | `rgb(180 83 9 / .16)` | top stop of climb-area gradient |
| `--focus` | `#FAFAFA` | `#09090B` | 2px focus ring, offset 2px |
| `--glass` | `rgb(9 9 11 / .75)` | `rgb(250 250 250 / .78)` | navbar, tooltips, palette |
| `--link` | `#FAFAFA` underlined | `#09090B` underlined | links are not amber |

Peak heatmap cell: `--accent-display` (9.3:1 dark, ≥3:1 on white light). Lower heatmap levels are zinc steps
(`l1` `--fill-2`, `l2` 22% text, `l3` 45% text); counts stay in each cell's accessible name, so meaning never
depends on colour.

**Contrast rule for labels.** `#71717A` on `#09090B` is 4.12:1 and on `#101013` 3.93:1: it fails AA for 12px text.
In dark it is used only for non-text (inactive dots, axis ticks). All 12px labels use `--text-3` `#8A8A93`.

`.inverse` survives for compatibility: its `--inv-*` tokens are the dark set in both themes, so an `.inverse`
element is an obsidian surface in light mode and a no-op in dark. New markup should not add it.

## 3. Typography

Inter (variable, self-hosted) for UI and prose; JetBrains Mono for IDs, keycaps, axis labels, code.
`font-feature-settings: "cv11", "ss01"` on Inter; `font-variant-numeric: tabular-nums` on every number in KPIs,
the ledger, charts, dates and ratings.

| Role | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|
| Display (hero h1) | `clamp(2.5rem, 6vw, 4.25rem)` | 650 | 1.05 | -0.04em |
| H2 section | `clamp(1.5rem, 3vw, 2rem)` | 600 | 1.15 | -0.03em |
| H3 card title | 1rem | 600 | 1.3 | -0.015em |
| KPI numeral | `clamp(1.75rem, 3.2vw, 2.25rem)` | 600 | 1 | -0.03em |
| Body | 1rem (prose 1.0625rem) | 400 | 1.6 | -0.011em |
| Subhead / lede | 1.0625–1.1875rem, `--text-2`, max 58ch | 400 | 1.5 | -0.011em |
| Nav link | 14px | 500 | 1 | -0.006em |
| Label | 12px, `--text-3` | 500 | 1.3 | 0 (no uppercase tracking games) |
| Mono / keycap / axis | 11px | 500 | 1.4 | 0, ligatures off |

Prose keeps `--read: 44rem`. Code blocks use 0.875rem mono and scroll horizontally inside their card.

## 4. Space, layout, radii

- Spacing scale (unchanged names): `--s1 .25rem` · `--s2 .5rem` · `--s3 .75rem` · `--s4 1rem` · `--s5 1.5rem` ·
  `--s6 2rem` · `--s7 3rem` · `--s8 4.5rem`.
- `--page: 64rem` (max-w-5xl). `--gutter: clamp(1rem, 4vw, 2rem)`; 16px side gutter at phone width.
- Homepage grid: 12 columns, `gap: var(--s4)`. Row 1 KPI strip 4×3 cols (2×2 under 48rem). Row 2 chart 12 cols.
  Row 3 Latest write-up 7 / Quiz 5, `align-items: stretch` (equal heights); stacks under 48rem.
- Radii: `--r-tile: 16px` (cards, panels, palette) · `--r-card: 12px` (inner cards, tooltips) · `--r-ctl: 8px`
  (inputs, tabs, segmented) · `--r-key: 4px` (keycaps) · `--r-pill: 999px` (CTA, search pill).
- No horizontal page overflow at 320px. Chart and ledger reflow; only code scrolls.

## 5. Elevation and material

| Level | Recipe |
|---|---|
| Canvas | `--bg` + `background-image: radial-gradient(ellipse 80% 50% at 50% -20%, var(--spot), transparent)` fixed to the top of `body` (not `fixed` attachment: avoids repaint on scroll) |
| Card (`.tile`, `.panel`) | `background: var(--tile); border: 1px solid var(--hair); box-shadow: var(--spec); border-radius: var(--r-tile)` |
| Glass (navbar, tooltip, palette) | `background: var(--glass); backdrop-filter: saturate(1.4) blur(16px); border: 1px solid var(--hair)`; `@supports not (backdrop-filter)` → `--tile` at 96% |
| Overlay scrim | `rgb(0 0 0 / .55)` behind the palette `<dialog>` |

Hairlines are always 1px; never stack a border and a shadow ring.

## 6. Components

**Navbar.** Sticky, height 3.25rem, glass, bottom hairline. Brand left; 14px links in `--text-2`, current link
`--text` with a 1px × 16px-wide `--text` underline indicator (not amber); ⌘K search pill; theme toggle.
Under 48rem links scroll horizontally inside the nav row with edge fade, never wrap.

**⌘K search pill.** `--fill` background, `--hair` border, `--r-pill`, `#A1A1AA` (light `--text-2`) text, 1.5px
magnifier icon, trailing keycap(s) showing `⌘ K` on Apple platforms, `Ctrl K` elsewhere.

**Keycap (`kbd`, `.key`, `.rb`).** `font: 500 11px/1.4 var(--mono)`; `padding: 2px 6px`; `background: var(--fill)`;
`border: 1px solid var(--hair)`; `border-radius: 4px`; `--text-2`. One component for shortcut hints, problem IDs
(`.rb`), rating bands and palette hints. Status stays shape-coded on `.rb`: solid border = solved myself, solid +
inner dot = with help, dashed border = not solved.

**Primary CTA.** White pill (`--accent-fill`/`--on-accent-fill`), 2.5rem min height (2.75rem touch), 15px/600.
One per view. Secondary = `.btn.quiet`: `--fill` + `--hair` border, `--text`.

**Road to 1800 card (hero).** Dark-titanium plate: `linear-gradient(160deg, #1A1A1F, #0E0E11 55%, #141418)`, hairline
+ specular, `--r-tile`. Contents (all from data): label "Road to 1800", big "1800" goal, a progress track whose amber
fill is `hardest_solved / 1800` labelled **"Hardest solved independently: 1300 (4C)"**, problems solved count, and
a "No Codeforces rating yet" note. Pointer tilt max ±6° via `transform: perspective(900px) rotateX/rotateY`, plus a
specular layer `radial-gradient(circle at var(--mx) var(--my), rgb(255 255 255 / .12), transparent 45%)`. Tilt
only for `(hover: hover) and (pointer: fine)` and motion allowed; resets on `pointerleave`. Light theme: brushed
aluminium `linear-gradient(160deg, #FFFFFF, #EDEDF0)`. Static, fully readable without JS.

**KPI strip.** Four cards: 12px `--text-3` label above, tabular KPI numeral, one muted 12px footnote.
Solved independently 29 · Active days 17 · Longest streak 10 days · Goal 1800 ("hardest solved 1300"). Values come
from `_data/activity_stats.json` / `_data/problems.json` at build time, never typed in.

**Climb chart (`.ladder`).** No shaded rank bands. Horizontal rules at 1800, 1900 (Expert), 1600 (Specialist),
1400 (Pupil), 1200 (Newbie top): `border-top: 1px dashed var(--hair-2)`. Axis labels 11px mono `--text-3`. Step-line
2px `--accent-display`, `vector-effect: non-scaling-stroke`; under it a closed path filled with
`linearGradient` from `--amber-wash-top` to transparent. Dots: solved = `--text` filled, with help = ring, not solved
= dashed ring. Every dot is a focusable `<a>` (to the problem page) with a glass tooltip (ID, name, rating, date,
"Open") shown on `:hover` and `:focus-visible`; tooltip flips near edges; `Esc` hides it (WCAG 1.4.13). Dot hit
area ≥24×24px (2.5.8). The figcaption keeps the key and summary for screen readers.

**Problem ledger.** Left-aligned rows: keycap ID · name + one-line lesson · monochrome topics · rating (tabular,
right) · date (tabular). Filter tabs (`role="tablist"`-free: a segmented `role="group"` of `aria-pressed` buttons):
All / Solved myself / Upsolved / With help / Not solved, `--r-ctl`, active = `--fill-2` + `--text`. Row hover =
`--tile-2`, 120ms. Tags: plain `--text-2` text separated by ` · `, no pill colour.

**Palette (`.cmdk`).** Glass dialog 40rem wide, `--r-tile`, input 16px, results 14px, selected row `--fill-2` with
2px left `--text` bar; footer hints as keycaps. Opens only with a modifier (Ctrl/⌘+K) or the pill.

**Quiz, roadmap, journal, stats, about.** Inherit through tokens: cards → card recipe, accent text → `--text` unless
it is progress. Roadmap stage progress may use amber (it is rating progress).

**Icons.** Inline SVG, 1.5px stroke, `currentColor`, round caps, 16 or 20px boxes. No filled multicolour icons.

## 7. Motion

| Token | Value | Use |
|---|---|---|
| `--ease` | `cubic-bezier(0.16, 1, 0.3, 1)` | everything (expo-out family) |
| `--t1` | 120ms | hover colour, row hover |
| `--t2` | 200ms | tabs, focus, tooltip in |
| `--t3` | 320ms | palette open, theme cross-fade |
| `--t-reveal` | 480ms | scroll reveal |

Scroll reveal (`[data-reveal]`, section heads): from `opacity: 0; translateY(12px)` to rest, 480ms `--ease`, once,
triggered at 12% of the element inside the viewport (`start: 'top 88%'`), 50ms sibling stagger, transform/opacity
only, elements keep their box (zero CLS). Elements already in view on load are not hidden. Hero tilt uses rAF with
lerp 0.12. Everything above is off under `prefers-reduced-motion: reduce` (the `.motion` class is not set).

Hero canvas scenes (network, mesh, field, grid, sort): zinc hairlines `--hero-line: 161 161 170`, dots
`--hero-dot: 250 250 250`, highlight `--hero-hi: 245 158 11`, `--hero-alpha: .28` dark / `.22` light
(`9 9 11` lines in light). They sit behind the hero text and never compete with it.

## 8. Do / Don't

**Do**
- Use tokens; never raw hex in components.
- Keep amber to progress: rating bar, climb line + fill, peak heatmap cell, roadmap progress.
- Set every number in tabular figures.
- Keep all `data-*` hooks, URLs, ids and the `<select name="status">` the tests and scripts rely on.
- Test both themes at 320px, 768px, 1280px.

**Don't**
- No navy, no saffron, no blue, no rank-coloured badges, no rainbow tags.
- No decorative grids, glassmorphism on content cards, glows, neon, or gradient text.
- No 12px text below 4.5:1; no `#71717A` text on dark.
- No single-key global shortcuts (`?`, `/`, `j/k` work only while focus is inside the palette or a widget).
- Never label 1300 as a rating; never invent stats, ratings or links.
- No new runtime framework or CDN; Blender/Higgsfield renders are replaced by the CSS/SVG titanium card.
