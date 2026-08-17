---
name: Kinetic Enterprise
colors:
  surface: '#031427'
  surface-dim: '#031427'
  surface-bright: '#2a3a4f'
  surface-container-lowest: '#000f21'
  surface-container-low: '#0b1c30'
  surface-container: '#102034'
  surface-container-high: '#1b2b3f'
  surface-container-highest: '#26364a'
  on-surface: '#d3e4fe'
  on-surface-variant: '#c7c4d8'
  inverse-surface: '#d3e4fe'
  inverse-on-surface: '#213145'
  outline: '#918fa1'
  outline-variant: '#464555'
  surface-tint: '#c3c0ff'
  primary: '#c3c0ff'
  on-primary: '#1d00a5'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#4d44e3'
  secondary: '#c1c1ff'
  on-secondary: '#1400a8'
  secondary-container: '#2f27d0'
  on-secondary-container: '#b1b1ff'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#006e4b'
  on-tertiary-container: '#67f4b7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#e1dfff'
  secondary-fixed-dim: '#c1c1ff'
  on-secondary-fixed: '#09006b'
  on-secondary-fixed-variant: '#2c24ce'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#031427'
  on-background: '#d3e4fe'
  surface-variant: '#26364a'
  status-backlog: '#94A3B8'
  status-todo: '#3B82F6'
  status-inprogress: '#4F46E5'
  status-review: '#8B5CF6'
  status-blocked: '#EF4444'
  status-done: '#10B981'
  status-cancelled: '#475569'
  warning-amber: '#F59E0B'
  zinc-surface: '#09090B'
  zinc-border: '#27272A'
typography:
  display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  mono:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

This design system is engineered for high-velocity enterprise workflows, blending the precision of developer-centric tools with the approachability of modern SaaS. The aesthetic is heavily influenced by the "Linear" and "Vercel" movements: ultra-clean, data-dense, and unapologetically functional.

The brand personality is **intelligent, efficient, and reliable**. It avoids unnecessary ornamentation in favor of crisp typography, subtle depth, and a sophisticated monochromatic foundation punctuated by vibrant, meaningful status colors. The interface should feel like a high-performance instrument—responsive, quiet when idle, and incredibly clear during complex operations.

The style is **Corporate / Modern** with a technical edge. It utilizes a predominantly neutral canvas to ensure that AI-generated insights and critical task statuses command immediate attention without visual fatigue.

## Colors

The palette is anchored by a deep **Zinc and Slate** foundation to support a "Dark Mode first" enterprise experience, though it scales perfectly to light mode. 

- **Primary Identity:** Indigo (#4F46E5) serves as the primary action color, providing a strong sense of focus and brand recognition.
- **Semantic Logic:** Status colors are strictly mapped to workflow states to reduce cognitive load. 'Done' always utilizes Emerald, while 'Urgent' or 'Blocked' triggers the high-visibility Red.
- **Contrast & Accessibility:** All text/background combinations are tuned to meet WCAG 2.2 AA standards. In dark mode, borders use a subtle Zinc-800 to define structure without creating harsh visual breaks.

## Typography

This system uses a dual-font approach to maximize legibility and technical aesthetic:
- **Geist** is used for headlines, labels, and UI controls. Its geometric precision and monospaced-influence reflect the AI/Technical nature of the platform.
- **Inter** is used for all long-form body text and data entries, providing industry-leading readability in dense information environments.

Typography scales are tight, favoring smaller gaps between levels to allow for high information density. Tracking (letter-spacing) is slightly tightened on headlines to create a "locked-in" professional appearance.

## Layout & Spacing

The system follows a strict **8px grid**, ensuring all components align to a predictable visual rhythm.

- **Grid Model:** A 12-column fluid grid is used for main dashboards, while specialized views (like Kanban or Gantt) use a horizontal-scroll-protected container model.
- **Density:** In "Data-Heavy" views, spacing can be compressed to a 4px sub-grid for table rows and list items to maximize content visibility.
- **Breakpoints:**
  - **Mobile (<768px):** Single column, 16px side margins.
  - **Tablet (768px - 1024px):** 8-column grid, 24px margins.
  - **Desktop (>1024px):** 12-column grid, max-width of 1440px, centered.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows.

- **Surface Levels:** 
  - Level 0 (Background): Deepest Zinc/Slate.
  - Level 1 (Cards/Sidebar): Slightly lighter Zinc to create separation.
  - Level 2 (Modals/Popovers): Lightest neutral surface.
- **Outlines:** Every surface is defined by a 1px soft border. This creates a "sheet" effect that feels structural and architectural.
- **Shadows:** Only used for floating elements (modals, dropdowns). Use a multi-layered, low-opacity shadow (e.g., `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`) to provide just enough lift to signify interaction priority.

## Shapes

The shape language is disciplined and "Soft-Industrial." 

- **Standard Elements:** Inputs, badges, and small buttons use a 4px (Soft) radius to maintain a precise, technical look.
- **Container Elements:** Main content cards and large buttons use an 8px (Rounded-LG) radius to feel more approachable and modern.
- **Interactive States:** Focus states are indicated by a 2px offset ring in the Primary Indigo color, preserving the sharp corners of the UI.

## Components

- **Buttons:** Primary buttons use a solid Indigo fill with white text. Secondary buttons use a ghost style (border only) to maintain hierarchy. Use a subtle brightness increase on hover.
- **Input Fields:** 1px Zinc-border with a subtle background tint. Focus states transition the border to Primary Indigo with a soft glow.
- **Chips/Badges:** Use a "tinted" style—semi-transparent background of the status color with a high-contrast text label (e.g., Success Chip has a 10% Emerald background with 100% Emerald text).
- **Cards:** No shadows by default; defined by a 1px border. On hover, the border color shifts slightly lighter to indicate interactivity.
- **Status Indicators:** Use small, solid circular dots paired with Label-SM typography for workflow stages.
- **Data Tables:** Remove all vertical borders. Use horizontal dividers only. Rows should have a subtle background highlight on hover to assist with tracking across the screen.