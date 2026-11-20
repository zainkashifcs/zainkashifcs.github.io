# DESIGN.md: Obsidian & Amber

Zain's competitive-programming journal. Direction: **Raycast × Revolut Metal × Apple Pro**. A dark obsidian instrument
panel: hairline cards with a top specular edge, one amber signal, precise type, numbers set in tabular figures.
Jekyll 3.10 + one stylesheet (`assets/css/style.css`) + vanilla JS. This file is the contract; the stylesheet's
`:root` token block implements it.

## 1. Principles

1. **One signal colour.** Amber means progress toward 1800 and nothing else: the rating-progress bar, the climb
   step-line (and the gradient under it), peak heatmap cells, the hardest-solved series on /stats/ and the brand
   mark's wedge while the brand link is hovered or focused. Never on buttons, links, tags, headings or badges.
2. **Light comes from above.** A faint ambient glow behind the page and a 1px inset highlight on every card. No drop
   shadows on dark cards (the metal focus card is the one grounded exception), no gradients except the ambient glow,
   the metal sheen and the amber fill under the climb line.
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
| `--bg` | `#0B0C0E` | `#F4F6F9` | canvas |
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

**Mona Sans** (GitHub's variable grotesk: weight 200 to 900 plus an optical-size axis) for display, UI and prose;
**Mona Sans Mono** (weight 200 to 900) for problem IDs, keycaps, axis labels and code. Files:
`assets/fonts/MonaSans-Variable.woff2` (137 KB) and `MonaSansMono-Variable.woff2` (39 KB), self-hosted so the offline
cache keeps working and no visitor makes a third-party request. Both are OFL 1.1 with the Reserved Font Name
"Mona Sans" (`OFL-mona-sans.txt`), so they ship unmodified: subsetting would mean renaming the family.

Why this pair: the site is a developer's journal, and Mona Sans comes out of the same place (GitHub) without being the
default every dev site already uses. Its optical-size axis tightens the letterforms at display sizes and opens them at
11 to 13px, so one family covers the hero and the 11px labels. The mono is drawn on the same skeleton, so IDs like
`1791D` sit beside prose without a change of voice. Runners-up were Instrument Sans (body) and Martian Mono.

Tokens: `--font-display`, `--font-sans`, `--font-mono` (`--sans` and `--mono` stay as short aliases). Both faces use
`font-display: swap`; the default layout preloads both and `sw.js` precaches both. Features: `font-optical-sizing:
auto` and `"ss03"` (the tailed l, so l, I and 1 stay distinct in IDs and prose) on body; code, keycaps and quiz caps
reset to the mono's own glyphs. `font-variant-numeric: tabular-nums` goes on every number in KPIs, the ledger, ratings,
keycaps, chart labels (`svg text`) and dates. The canvas scripts (constellation labels, hero animals) name the same
families.

| Role | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|
| Display (hero h1) | `clamp(2.5rem, 6vw, 4.25rem)` | 650 (Mona Sans, optical size auto) | 1.05 | -0.025em |
| H2 section | `clamp(1.5rem, 3vw, 2rem)` | 600 | 1.15 | -0.025em |
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
| Canvas | `html` paints `--bg`; a `position: fixed` `body::before` layer at `z-index: -1` carries `--ambient` (three faint radial glows), so scrolling repaints nothing |
| Card (`.tile`, `.panel`) | `background: var(--tile); border: 1px solid var(--hair); box-shadow: var(--spec); border-radius: var(--r-tile)` |
| Glass (navbar, tooltip, palette) | `background: var(--glass); backdrop-filter: saturate(1.4) blur(16px); border: 1px solid var(--hair)`; `@supports not (backdrop-filter)` → `--tile` at 96% |
| Overlay scrim | `rgb(0 0 0 / .55)` behind the palette `<dialog>` |

Hairlines are always 1px; never stack a border and a shadow ring.

## 6. Components

**Brand mark.** `_includes/logo-mark.html`: a 20×20 sunrise, `aria-hidden`, `currentColor`: a half sun on the horizon
over two shortening reflection bars (no rays). It sits in the brand link `a.brand.brand-pill.glass-chip`, a square-ish
glass pill (7px padding, 10px radius). Where hovering exists the pill shows only the sun and widens on `:hover` or
`:focus-visible` to reveal "Zain's Blog": a CSS grid column animates `0fr` to `1fr` over 360ms
`cubic-bezier(.22, 1, .36, 1)` while the name goes from `opacity: 0; translate: -4px 0` to rest. The brand keeps
`margin-inline-end: auto`, so it grows into free space and the nav links never move. On touch (`hover: none`) the name
is always visible. The name stays in the accessibility tree when collapsed. The sun turns `--accent-display` on hover
or focus. `assets/favicon.svg` is the same drawing (viewBox 1 1 18 18), `#09090B`, or `#FAFAFA` under
`prefers-color-scheme: dark`.

**Glass chips.** Small chips, badges and keycaps carry a Liquid Glass rim; cards, panels and ledger rows stay matte.
Tokens: `--chip-bg` (dark `linear-gradient(180deg, rgb(255 255 255 / .065), rgb(255 255 255 / .025))`), `--chip-bg-hover`,
`--chip-bg-on`, `--chip-border` (white 11%), `--chip-border-hover` (20%), `--chip-rim` (`inset 0 1px 0` white 18% plus
`0 1px 2px` black 35%), `--chip-top` (the top border; same as `--chip-border` in dark) and `--chip-blur`. Light is a
real glass, not a flat white chip: `--chip-bg` `linear-gradient(180deg, rgb(255 255 255 / .92) 0%, rgb(232 238 247 / .72)
55%, rgb(255 255 255 / .85) 100%)`, border `rgb(15 23 42 / .14)` with a pure white top edge, rim `inset 0 1.5px 1px #FFF,
inset 0 -1.5px 2.5px rgb(15 23 42 / .08), 0 2px 6px -1px rgb(15 23 42 / .1), 0 1px 2px rgb(15 23 42 / .06)`, blur
`blur(12px) saturate(160%)`. They style `kbd`, `.key-cap`, `.rb`, `.chip`, `.tag`, `.kc`, the problem index rail tabs
and, in light only, the quiz option caps 1 to 4 (the selected, correct and wrong states still win). The `.glass-chip`
class adds the `--chip-blur` backdrop filter (dark `blur(8px) saturate(130%)`);
inside the header and on the metal focus card the blur is switched off because it cannot show there. Status shapes still win: a not-solved `.rb` stays dashed with no fill or rim.

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

**Current focus card (hero).** Machined metal: `--metal` (dark `linear-gradient(145deg, #1C1D21, #131417 50%, #191A1E)`, light
anodised aluminium `#F6F7F9 / #EBEDF0 / #F3F4F6`) under a faint 1px brushed grain, a `--metal-rim` hairline and
`--metal-shadow` (top bevel highlight plus a grounded 0 12px 32px shadow), `--r-tile`, built from the data files with
fallbacks (`_includes/focus-card.html`). "Boss fight": the first not-solved problem in the Next up order, as a dashed
keycap, name, rating, topic tags, an optional one-line note from `_data/focus.json` (by problem ID) and its last
attempt, linking to the problem on Codeforces. Rank progress: the Codeforces rating (`_data/codeforces.json`) on a
0 to goal track with an amber fill, ticks at the 1200 / 1400 / 1600 rank floors (3:1 track outline) and milestone
badges (Pupil 1200, Specialist 1400, Expert 1600, Goal 1800; reached ones get a tick). Footer badges: best streak
(`activity_stats.longest_streak`) and the last solutions-repo commit synced (`sync_state.solutions_head_short`,
linking to the commit). The hero's own text no longer repeats the KPI numbers.

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

**Topic mastery (`.mx`, /stats/).** A table of every topic with problems, weakest first: solved myself as `x/y`
with a 4px monochrome bar, with help or redo, not solved, hardest solved myself, and quiz recall (filled by
`mastery.js` from `quiz-progress`, read-only). A topic with any problem not solved independently carries a
"Weak spot" outline pill (text, not colour). Under 40rem rows become two-column cards labelled from `data-label`.

**Next up and Weakest topics (homepage, 7 / 5 columns).** Next up lists not solved, then with help, then redo-only
problems, easiest first, at most five, each with a written reason and the status keycap. A due quiz review item is
added on top in the browser. Weakest topics shows the first three weak rows of the matrix, linking to the filtered
index.

**Difficulty over time (`.vel`, /stats/).** Weekly hardest (amber 2px line and 8px dots) and median (14px grey
ring, no line) of problems solved myself, on dashed 100-point rules. The plot is `aria-hidden` and a "Weekly
numbers" table repeats it. The sentence states the 28 days to the build date without projection, and the homepage climb
tile carries the same fact in one line (`.vel-line`).

**Ledger keyboard and filters.** While a row has focus, ↑ ↓ Home End move between visible rows (no global keys).
Active filters show as removable chips (`.idx-x`, accessible name "Remove filter: …") with "Clear all" from two
chips up, and "Copy link" copies the current filtered URL with a status message.

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

Scroll reveal (`[data-reveal]`, section heads; assets/js/motion.js): replays in both directions. Enter when 12% is in
view, from `opacity: 0; translateY(14px) scale(.985)` over 480ms `--ease` with a 35ms sibling stagger (18ms for chart
dots); reset only after the element has fully left the viewport plus 48px, over 180ms. Elements already in view on load
are shown without animating. Everything is off under `prefers-reduced-motion: reduce` and in print.

Hero animals (`assets/js/hero-animals.js`, adapted under MIT from "ASCII Animals" by Pawan-webdeveloper): a full-bleed
canvas of pixel/ASCII koi (a click on empty hero space drops food they swim to, eat and then disperse from),
jellyfish or cranes (a click startles them). One animal per page load, never the one shown last time (localStorage
`heroLastAnimal`). Creatures start one per cell of a two-row grid across the whole canvas and keep about 165px apart
with a soft separation force. `--animals-alpha` .32 dark / .24 light, fading out over the bottom 28%; never takes
pointer events; loops only while on screen and visible; one still frame under reduced motion. Secondary hero text
uses `--hero-text-2` (#D4D4D8 dark) so it keeps at least 5:1 contrast over a passing animal.

Ambient page glow: a fixed `body::before` layer behind everything with three faint radial glows (`--ambient`: sky top
right, amber middle left, indigo bottom right) over `--bg` (#0B0C0E dark, #F4F6F9 light). Light uses stronger alphas so the glow reads on a pale page: sky
.14, amber .11, indigo .11 (dark .055 / .035 / .045). Hidden in print.

Algorithm dry-runs (`assets/js/algo-visualizer.js`, `_includes/visualizer.html`, mounted when `_data/visualizers.json`
has an entry for the problem ID): a card with the demo's inputs, a drawing on `--tile-2`, the key code lines (the current
line gets `--fill-2` and a 2px `--text` bar, never amber) and a one-line explanation in a live region. Controls are glass
chips: reset, back, play/pause (label changes), forward, a range timeline, a 1x/2x group. No autoplay; reduced motion
removes the tweening. Shipped for 1A, 263A, 405A and 1791D.

Topic constellation (`assets/js/constellation-graph.js`, `_includes/constellation.html` on /stats/ and /roadmap/): a
force-directed canvas built from `problems.json` and the topic list. Hubs sized by problems solved myself; problems
sized by rating; status by shape (filled = solved myself, ring = with help, dashed ring = redo only). The pulsing amber
ring on not-solved problems is an allowed amber exception (the boss fight), like the "Needs review" dot. Hover dims
everything else to 15%; the details list underneath is the text equivalent. The loop runs only while on screen and
visible, idles once the layout settles, and draws one still frame under reduced motion.

Motion engine (`assets/js/motion-engine.js`, every page): `window.MotionSpring` (semi-implicit Euler: stiffness, damping,
mass; retargets mid-flight). A glass pill glides between the pressed options of segmented groups (Vault tabs, rating
bands, constellation tiers, pace pills, visualizer speed, timer mode); the header nav has a hover pill that settles back
on the current page; horizontal scrollers rubber-band at their edges. Reveals re-enter from the side they left by.
Opens 200ms (`--ease-spring`), closes 120ms; presses go to `.96` and spring back with `--ease-overshoot`. Keyboard row
stepping stays instant. Everything jumps under reduced motion.

The Vault (the problem index, `#index`): a glass count badge (archived, cracked = solved myself, boss fights = not
solved), an amber outline and soft glow on the ID keycap of not-solved rows (boss-fight exception; no side stripe), row chevrons that nudge on hover, a 20ms cascade
when rows come back after filtering, and "Random Vault pick": a short shuffle, then the pick is focused, announced and
opened with Enter.

The Knowledge Constellation (rebuild): hubs anchored on a padded ellipse (64px from every edge) in a world at least
640px wide (narrow screens start zoomed out), curved gradient filaments with a hover pulse, frosted hubs with a
solved-ratio arc, jewel nodes, an amber beacon for not-solved problems, decorative unlabelled orbit rings, Ctrl/Cmd +
scroll or pinch to zoom, +/- buttons, background drag to pan, labels that avoid nodes and each other.

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
- No new runtime framework or CDN; Blender/Higgsfield renders are not used; the hero is the Current focus card over a canvas.
