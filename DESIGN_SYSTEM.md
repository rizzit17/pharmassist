# DESIGN_SYSTEM.md — Visual Restyle Pass (AIVOA Brand Match)

**Scope: STYLING ONLY.** This document describes CSS/Tailwind-level visual changes to apply to the existing, fully-built application. Do not modify component logic, state management, API contracts, routing, LangGraph nodes, database schema, or any functional behavior. Every change below should be achievable by editing `tailwind.config.ts`, global CSS variables, and className/style props on existing components — no new components, no new props, no new features.

Give this file to Antigravity as: *"Apply this design system as a pure visual restyle. Do not alter any existing functionality, data flow, component structure, or content — only colors, typography, spacing, borders, icons, and micro-interactions."*

---

## 1. Color Tokens

Replace existing Tailwind/CSS color variables with these. Keep variable *names* the same if they already exist in the codebase (e.g. `--primary`, `--accent`) — just swap the values, so nothing referencing them needs to change.

```css
:root {
  /* Primary accent — indigo/violet, matches AIVOA brand */
  --accent-600: #5B4FE9;   /* primary buttons, links, active states */
  --accent-500: #6C5CE7;   /* hover states, gradients */
  --accent-100: #E8E6FD;   /* icon-chip backgrounds, badge backgrounds */
  --accent-50:  #F1F0FE;   /* section background tint (Copilot pane, alternating sections) */

  /* Neutrals */
  --bg-white:   #FFFFFF;
  --bg-page:    #FAFAFB;
  --border-subtle: #E7E5F5;   /* thin card borders, hairline dividers */
  --text-primary:   #0F0E17;  /* headline black */
  --text-secondary: #5B5A6A;  /* body copy gray */
  --text-muted:     #9997A8;  /* placeholder / "Awaiting AI extraction..." text */

  /* Semantic status (traffic-light system, matches AIVOA's own product) */
  --status-success-bg: #E9F9EE;
  --status-success-text: #1C9A4B;
  --status-success-icon: #22C55E;

  --status-warning-bg: #FEF6E7;
  --status-warning-text: #B7791F;
  --status-warning-icon: #F5A524;

  --status-critical-bg: #FDEDEC;
  --status-critical-text: #C0392B;
  --status-critical-icon: #E74C3C;

  --status-info-bg: #EBF3FF;
  --status-info-text: #2563EB;
  --status-info-icon: #3B82F6;
}
```

**Where to apply:**
- `--accent-600` → primary buttons ("Commit to QMS Ledger", "Send" button), active nav item, links, focus rings
- `--accent-50` → the Copilot chat pane's background (form pane stays white); also use for alternating section backgrounds on Dashboard/List pages if any exist
- Status pill component: swap current colors for the semantic tokens above — `Pending Triage` → warning, `Ready to Commit` → success, `Committed` → info, any "Critical" severity badge → critical

---

## 2. Typography

Keep Inter as the primary font (already correct). Add these adjustments:

```css
/* Headlines (page titles, section titles like "Log Customer Complaint") */
.heading-xl { font-weight: 800; letter-spacing: -0.02em; }
.heading-lg { font-weight: 700; letter-spacing: -0.015em; }

/* Section eyebrow labels — e.g. "1. PRODUCT & BATCH IDENTIFICATION" */
.eyebrow-label {
  font-size: 0.6875rem; /* 11px */
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-600);
}

/* Monospace — for batch numbers, extracted-data snippets, audit log entries */
.font-mono-data {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 0.8125rem;
}
```

**Where to apply:**
- Section labels in the complaint form ("ORIGIN & CUSTOMER DETAILS" etc.) → `.eyebrow-label`, recolor to `--accent-600` (currently likely gray)
- Page headline "Log Customer Complaint" → `.heading-xl`
- Batch/Lot Number field value, expiry/manufacturing dates, and any raw extracted-JSON debug display in chat → `.font-mono-data`
- Audit trail timeline entries (field name / old value / new value) → `.font-mono-data` for the value portions specifically

---

## 3. Cards & Surfaces

Current cards likely use soft shadows. Switch to AIVOA's actual pattern: **thin border, minimal/no shadow, larger radius.**

```css
.card {
  background: var(--bg-white);
  border: 1px solid var(--border-subtle);
  border-radius: 1rem; /* 16px, up from likely 8-12px */
  box-shadow: none; /* remove drop shadows entirely, or keep only a 1px 2px near-invisible one */
}

.card-tinted {
  background: var(--accent-50);
  border: 1px solid var(--border-subtle);
  border-radius: 1rem;
}
```

**Where to apply:**
- Every existing `<Card>` component: swap shadow-based elevation for border-based elevation
- The "AI Copilot Risk Assessment" card specifically → `.card-tinted` (light indigo background, matches AIVOA's tinted-section pattern) instead of whatever background it currently has

---

## 4. Icon Chips

AIVOA uses small rounded-square pastel icon containers everywhere (problem cards, module cards, feature list). Apply this pattern to existing icons in your app — same icons you already have, just wrap them differently.

```css
.icon-chip {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.625rem; /* 10px, rounded square not circle */
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-chip-accent   { background: var(--accent-100); color: var(--accent-600); }
.icon-chip-success  { background: var(--status-success-bg); color: var(--status-success-icon); }
.icon-chip-warning  { background: var(--status-warning-bg); color: var(--status-warning-icon); }
.icon-chip-critical { background: var(--status-critical-bg); color: var(--status-critical-icon); }
```

**Where to apply:**
- The shield icon on "AI Copilot Risk Assessment" → wrap in `.icon-chip-accent`
- The flask/lab icon in the Copilot panel header → wrap in `.icon-chip-accent`
- Completeness checker icons, duplicate-warning icon, any severity-related icon → map to the matching semantic chip class
- Sidebar nav icons (if currently plain/flat) → optional, can leave as-is if it complicates layout; icon chips matter most in the form/chat panels

---

## 5. Badges / Pills

Existing severity badges, status pills, and any small tag/chip elements should switch to this treatment:

```css
.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
```
Combine with the semantic bg/text token pairs from Section 1 (e.g. `background: var(--status-warning-bg); color: var(--status-warning-text);`).

Add a small leading dot indicator (already present in your status pill per the reference screenshots — keep it, just recolor using the tokens above):
```css
.pill-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: currentColor;
}
```

---

## 6. Buttons

```css
.btn-primary {
  background: var(--accent-600);
  color: white;
  border-radius: 0.625rem; /* 10px — rounded-lg, not fully pill */
  font-weight: 600;
  transition: background 0.15s ease;
}
.btn-primary:hover { background: var(--accent-500); }

.btn-secondary {
  background: white;
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  border-radius: 0.625rem;
  font-weight: 600;
}
```

**Where to apply:** "Commit to QMS Ledger" button, chat send button, any primary CTA → `.btn-primary`. Keep existing button component structure/props; only restyle.

---

## 7. Field Highlight Animation (AI-updated fields)

Keep the existing green-highlight-on-update behavior exactly as built — only adjust the color values to match the new success token, and soften it slightly to feel more like a "confirmation glow" than a hard flash:

```css
.field-highlight {
  border-color: var(--status-success-icon);
  background-color: var(--status-success-bg);
  transition: border-color 0.3s ease, background-color 0.3s ease;
}
/* fade back to normal state after ~2.5-3s — keep existing timing logic, just swap colors */
```

---

## 8. Chat Panel Specific Touches

- Copilot pane background → `var(--accent-50)` (light lavender), form pane stays white — creates the two-tone split described in Section 3 of ARCHITECTURE.md
- Assistant message bubbles: white background, `.card` border style (thin border, no heavy shadow), rounded-2xl
- User message bubbles: solid `var(--accent-600)` background, white text, rounded-2xl
- File upload card (e.g. "Fictional_Pharma_Customer_Complaint.pdf"): use `.card` style with a small colored file-type icon chip (`.icon-chip`) on the left
- Any raw structured-data preview shown during extraction (optional, if you want the "on-brand" touch described earlier): render in a small `.font-mono-data` block with `var(--bg-page)` background and `.card` border — mimics AIVOA's own "AI Draft → qms_ai_drafts (status: GENERATING)" log-style snippet aesthetic
- "POWERED BY LANGGRAPH" footer caption → style as `.eyebrow-label` treatment but muted (`--text-muted` color instead of accent) since it's a footnote, not a section header

---

## 9. Optional Polish (only if trivial to add without touching logic)

- Add a thin solid `var(--accent-600)` ticker/banner strip is NOT recommended for your app (that's marketing-site chrome, not appropriate for an internal QA tool) — skip this one, mentioned only to explicitly rule it out
- Browser-chrome framing (macOS traffic-light dots) around any embedded preview/demo screenshot if your Dashboard or README includes product screenshots — nice touch for the demo video/README visuals, not required in-app
- Section headers on Dashboard/List pages, if they exist, can adopt the alternating white/`--accent-50` background rhythm AIVOA uses on their marketing site, to reinforce the visual system beyond just the New Complaint screen

---

## 10. What NOT to Touch

Explicitly out of scope for this pass — do not change:
- Component structure, prop signatures, file organization
- Redux slice shape or state logic
- API contracts, LangGraph node behavior, backend code
- Copy/content/microcopy text (unless a color/weight-only typography class is applied to existing text)
- Existing responsive breakpoints/layout structure — only colors, borders, radii, spacing values within the existing layout
