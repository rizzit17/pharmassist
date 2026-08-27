# MASTER PROMPT — PharmAssist Bento Grid Redesign

Paste this whole document to Antigravity as the task brief.

---

## ROLE & SCOPE

You are redesigning the existing, fully-functional PharmAssist application (an AI-powered pharmaceutical complaint management QMS tool). This is a **structural layout + visual design redesign**, not a rebuild. Do not change any business logic, API calls, Redux state, routing, LangGraph workflow, or data — every number, label, and behavior currently on screen must still work identically after this redesign. You are only changing how information is arranged and styled.

The core idea: replace the current uniform "4 equal cards in a row" dashboard layout with an **asymmetric bento-grid** — varying card sizes that create visual hierarchy, where the most important information (critical/high-risk complaints) is physically larger and more prominent than secondary stats. Apply this bento-grid thinking as the organizing principle across every screen that currently uses a flat grid of equal-sized cards, not just the Dashboard.

---

## 1. CORE LAYOUT PRINCIPLE: THE BENTO GRID

A bento grid is an asymmetric CSS grid where cards span different numbers of columns/rows based on their importance, not a uniform repeat pattern. Rules to apply throughout:

- Use CSS Grid with explicit `grid-template-columns` / `grid-template-areas` (or a 12-column grid with cards spanning 3/4/6/8/12 columns as needed) — not `flex-wrap` with equal-width children.
- Every bento layout needs **one clear hero cell** — the single most important piece of information, rendered 2x the size (both width and often height) of secondary cells.
- Vary card heights, not just widths — some cells should be tall-and-narrow, some short-and-wide, creating visual rhythm rather than a rigid row-by-row grid.
- Maintain consistent gutter spacing (e.g. 16–20px gap) between all cells regardless of size, using CSS Grid's `gap` property — this is what keeps an asymmetric grid feeling intentional rather than broken.
- Each cell keeps rounded corners (16–20px radius, larger than typical due to the "chunky bento box" aesthetic), a soft border or very subtle shadow, and its own background treatment (see Section 2 for pastel/jewel-tone per-card accents).
- Responsive behavior: on tablet, collapse the grid to 2 columns, reflowing hero cells to still span 2 columns; on mobile, collapse to a single column, stacked in priority order (hero/most-important cell first).

---

## 2. COLOR SYSTEM — SOFT PASTEL / JEWEL-TONE PER-CARD ACCENTS

Keep a light base (white/very light gray page background) with a dark sidebar, consistent with the current app. Layer in per-card jewel-tone accents so each bento cell has its own subtle identity rather than every card looking identical.

```css
:root {
  --page-bg: #FAFAFB;
  --card-white: #FFFFFF;
  --border-subtle: #E9E7F5;
  --text-primary: #14131F;
  --text-secondary: #6B6979;
  --text-muted: #A5A3B3;

  /* Jewel-tone card accent backgrounds — soft, desaturated, used as full-card tints on specific bento cells */
  --jewel-violet-bg: #F2F0FE;   --jewel-violet-fg: #6C5CE7;
  --jewel-emerald-bg: #EAFBF3;  --jewel-emerald-fg: #0FA968;
  --jewel-amber-bg: #FFF8EA;    --jewel-amber-fg: #D6920A;
  --jewel-rose-bg: #FDEEF2;     --jewel-rose-fg: #E0447A;
  --jewel-sapphire-bg: #EBF3FE; --jewel-sapphire-fg: #2E6FE0;
  --jewel-teal-bg: #EAFAFA;     --jewel-teal-fg: #0D9C9C;

  /* Status semantics — unchanged meaning, reused within jewel system */
  --status-critical: #E0447A;   /* maps to jewel-rose */
  --status-warning: #D6920A;    /* maps to jewel-amber */
  --status-success: #0FA968;    /* maps to jewel-emerald */
  --status-info: #2E6FE0;       /* maps to jewel-sapphire */
}
```

**Assignment rule:** each hero/large bento cell gets a distinct jewel-tone tinted background (not white); smaller supporting cells nearby can stay white/neutral with just an icon-chip carrying the jewel color, so the eye lands on the tinted hero cells first. Never use more than 3–4 jewel tones visible in a single screen at once — pick a coherent subset per page rather than using all six everywhere.

---

## 3. SCREEN-BY-SCREEN REDESIGN

### 3.1 Dashboard (primary redesign target)

**Current:** 4 equal KPI cards in a row, then 2 equal-width chart cards, then a full-width table.

**New bento layout** (12-column grid):

```
Row 1 (hero row, ~280px tall):
┌─────────────────────────────┬───────────────┬───────────────┐
│  CRITICAL/HIGH RISK (hero)   │ TOTAL          │ THIS MONTH     │
│  spans 6 cols                │ COMPLAINTS     │ spans 3 cols   │
│  large number, jewel-rose bg │ spans 3 cols   │ jewel-sapphire │
│                               │ jewel-violet   │                │
└─────────────────────────────┴───────────────┴───────────────┘

Row 2:
┌───────────────┬─────────────────────────────────────────────┐
│ OPEN           │  SEVERITY DISTRIBUTION (donut)                │
│ COMPLAINTS     │  spans 8 cols, taller cell                    │
│ spans 4 cols   │  white card, jewel-colored legend chips       │
│ jewel-amber    │                                                │
└───────────────┴─────────────────────────────────────────────┘

Row 3:
┌───────────────────────────────────────────────────────────┐
│  MONTHLY TREND (chart)  — full width, spans 12 cols           │
│  white card, indigo/violet chart fill                         │
└───────────────────────────────────────────────────────────┘

Row 4:
┌───────────────────────────────────────────────────────────┐
│  RECENT COMPLAINTS (table) — full width, spans 12 cols        │
└───────────────────────────────────────────────────────────┘
```

Specific treatment:
- **Critical/High Risk hero card**: this is now the single largest, most visually dominant cell on the whole dashboard — big bold number (e.g. `48px+` font size), `--jewel-rose-bg` background, a large icon-chip in the corner, and add a one-line supporting sentence under the number (e.g. "Requires immediate action — review now") to justify the extra space, not just a blown-up number with empty room.
- **Total Complaints**: medium cell, `--jewel-violet-bg`, keep the trend indicator line but recolor per earlier guidance (volume increase = neutral/info blue, not alarmist red).
- **This Month**: smaller cell, `--jewel-sapphire-bg`.
- **Open Complaints**: `--jewel-amber-bg`, medium-width cell.
- **Severity Distribution donut**: give this more horizontal room than before (8 of 12 columns) and increase the donut's actual diameter — let it breathe; place the Critical/Major/Minor legend as a vertical list beside the donut instead of centered underneath, using small jewel-tone dot chips matching Section 2's status colors.
- **Monthly Trend**: keep full-width, but increase its height slightly relative to before, since it now sits alone in its row rather than squeezed next to the donut.
- **Recent Complaints table**: unchanged content, restyle row hover states to a very light jewel-violet tint on hover instead of plain gray, add slightly larger row padding for breathing room consistent with the more spacious bento cells above it.

### 3.2 Complaints List

The table itself stays a table (bento-izing individual rows would hurt scanability), but apply bento thinking to the header area:
- Turn the "22 total records" text into a small stat chip, and add 2-3 small summary chips beside it (e.g. "6 Critical," "3 Under Investigation") pulled from data already on screen — small jewel-toned pills, not full cards, sitting in a row above the search bar.
- Search bar and status filter dropdown: increase corner radius to match the new card radius (16px+), add a subtle jewel-violet focus ring on the search input.
- Table row severity badges: recolor to match the jewel-tone status mapping (Critical→rose, Major→amber, Minor→emerald), consistent with the dashboard donut and legend.

### 3.3 New Complaint (form + Copilot split screen)

Keep the two-pane structure (form left, chat right) — this doesn't need a bento restructure since it's a focused single-task screen, not a data-overview screen. Apply only the visual system:
- Form section cards (currently divided by thin rule lines) → convert each numbered section (1. Origin & Customer Details, 2. Product & Batch ID, etc.) into its own distinct bento-style card with rounded corners and a very subtle background tint alternating between white and `--page-bg`, rather than one continuous scrolling form — this breaks the long form into visually distinct "bento cells" stacked vertically, making it feel less like a monolithic form and more like the modular language used elsewhere.
- AI Copilot Risk Assessment card: give this the `--jewel-violet-bg` treatment (it's the "AI-generated insight" card, consistent with how hero/insight cells get jewel tints elsewhere) with a slightly larger corner radius and a soft glow/shadow to visually lift it above the plain form cards.
- Status pill ("Pending Triage" etc.): keep functionally the same, restyle color per existing semantic mapping (amber/green/blue).
- Chat panel background: keep the light lavender/jewel-violet tint already established, just confirm the radius/border treatment matches the new card system.

### 3.4 Copilot (full-screen)

- The intro message card ("Full-Screen AI Copilot / Natural language complaint extraction & QA assistant") becomes a bento hero header cell — full width, `--jewel-violet-bg`, larger padding, matching the New Complaint's Copilot panel treatment for visual consistency across both surfaces.
- Chat messages below keep current bubble structure, just update corner radius and border tokens to match.

### 3.5 History

- Turn each session card into a proper bento cell: currently a single flat white card — add a jewel-tone left-edge accent bar (4px wide, `--jewel-sapphire-fg` or violet) to visually tag it as a "session record," and increase corner radius to match the rest of the system.
- The "Current · Live Thread" pill: recolor to `--status-success`/emerald jewel tone (already green in your screenshot — just confirm it's using the jewel-emerald token, not a one-off green).
- Message preview block inside the card: `--page-bg` background, no border needed since it's nested inside the already-bordered card.

### 3.6 Settings

- Restructure the three sections (User Profile, LangGraph AI Model Routing, Interface Theme) into a **2-column bento layout on wide screens** instead of full-width stacked cards: User Profile and Interface Theme can sit side-by-side as medium cells (6 cols each) since they're both compact, while LangGraph AI Model Routing spans full width (12 cols) below them since it has more content (two model rows).
- Section icon chips (shield, chip/processor) → jewel-violet tint, larger (44px instead of current ~36px) to match the bolder icon-chip sizing used elsewhere in the redesign.
- "JWT Authentication Active" badge → `--jewel-emerald-bg`/`--jewel-emerald-fg`.
- Model routing rows (Primary Extraction & Intent Model / Complex Risk Analysis Model) → give each its own subtle bordered sub-cell within the parent card, rather than plain rows separated by whitespace, so they read as two small nested bento cells within the larger LangGraph card.

### 3.7 Login Screen

- Keep the centered card layout — this screen doesn't need bento treatment (single-purpose, no data hierarchy to express).
- Apply the new border-radius scale (16px+) and the `--jewel-violet-bg` as a very subtle background wash behind the card (instead of the current dark gradient background, OR keep the dark gradient if you want strong contrast — your call, but increase the card's own corner radius and update the button gradient to match the new jewel-violet accent tokens).
- "Continue as Demo User" button: add a soft `--jewel-violet-bg` tint on hover instead of plain white/gray hover.

---

## 4. TYPOGRAPHY ADJUSTMENTS FOR BENTO HIERARCHY

Since card sizes now vary, type scale should vary with them — this is what makes hero cells actually feel important, not just "the same card but bigger":

```css
.bento-hero-number   { font-size: 3rem;    font-weight: 800; letter-spacing: -0.02em; }  /* Critical/High Risk hero stat */
.bento-medium-number { font-size: 2rem;    font-weight: 700; letter-spacing: -0.015em; } /* Total Complaints, Open Complaints */
.bento-small-number  { font-size: 1.5rem;  font-weight: 700; }                            /* This Month, small supporting stats */

.bento-card-label    { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; }
```

---

## 5. ICON CHIPS — UPDATED SIZING FOR BENTO SCALE

Increase icon-chip size proportionally to card size:
```css
.icon-chip-hero   { width: 3rem;  height: 3rem;  border-radius: 0.875rem; }  /* on hero cells */
.icon-chip-medium { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; }  /* medium cells */
.icon-chip-small  { width: 2rem;  height: 2rem;  border-radius: 0.625rem; }  /* small cells, table rows, list items */
```
Each chip's background/foreground color pulls from the jewel-tone tokens matching its parent card (Section 2).

---

## 6. MOTION (LIGHT TOUCH)

- On page load, bento cells can stagger-fade-in (e.g. 40–60ms delay between each cell, subtle upward translate + opacity fade) using Framer Motion — this is a common, tasteful bento-grid signature and reinforces the "designed, not templated" feeling.
- Hover state on any bento cell: very subtle scale (1.01–1.02x) + slightly deeper shadow, fast transition (150ms) — skip this on the table rows/list items, reserve it for actual bento grid cells (dashboard stat cards, settings cards, etc.) to avoid excessive motion everywhere.
- Keep all existing functional animations (field-highlight-on-AI-update, chat message appearance, loading indicators) exactly as they are — this section only adds new layout-entrance/hover motion, doesn't touch existing interaction animations.

---

## 7. WHAT NOT TO CHANGE

- No changes to Redux state shape, API contracts, LangGraph nodes, backend code, or database schema.
- No changes to copy/text content anywhere.
- No changes to existing component logic, prop signatures, or file organization beyond what's needed to restructure grid layout (i.e. changing a flex container to a CSS grid container is fine; rewriting the data-fetching logic inside that component is not).
- No changes to the sidebar navigation structure, items, or icons — only apply consistent border-radius/jewel-tone touches if you choose, but don't restructure it.
- Don't apply the bento treatment to the two-pane New Complaint form-vs-chat split itself (Section 3.3) — that split-screen structure stays as-is; bento thinking there only applies inside the form's own vertical stack of section cards.
- Don't over-apply jewel tones — if in doubt, default a card to white with just a colored icon-chip rather than a fully tinted background; reserve full-card tints for genuine hero/emphasis cells per Section 3's specific guidance.

---

## 8. EXECUTION ORDER

1. Establish the new color tokens, border-radius scale, and typography classes globally first (Sections 2, 4, 5).
2. Redesign the Dashboard bento grid (Section 3.1) — this is the highest-impact, highest-visibility screen and the main structural showcase of this redesign.
3. Apply the lighter-touch updates to Complaints List, New Complaint, Copilot, History, Settings, and Login in that order (Sections 3.2–3.7).
4. Add entrance/hover motion last (Section 6), after layout and color are locked in, so animation timing can be tuned against the final card sizes.
5. Do a full click-through of every screen at desktop, tablet, and mobile widths to confirm the bento grid's responsive collapse behavior (Section 1) works cleanly at each breakpoint before considering this complete.
