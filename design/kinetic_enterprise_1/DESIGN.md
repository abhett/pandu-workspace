---
name: Kinetic Enterprise
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#464555'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#571ac0'
  on-tertiary: '#ffffff'
  tertiary-container: '#6f3dd9'
  on-tertiary-container: '#e3d5ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#e9ddff'
  tertiary-fixed-dim: '#d0bcff'
  on-tertiary-fixed: '#23005c'
  on-tertiary-fixed-variant: '#5516be'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  container-max: 1440px
---

## Brand & Style

The design system is engineered for high-performance enterprise environments where clarity, speed, and precision are paramount. The brand personality is professional and technical, yet remains approachable through balanced whitespace and refined typography. It draws heavily from **Modern Minimalism** with a focus on functional aesthetics—prioritizing content density without sacrificing legibility.

The target audience consists of power users, developers, and project managers who require a tool that feels like a high-end instrument. The emotional response should be one of "calm control"—a UI that recedes to let the user's work take center stage, using subtle motion and crisp borders to define the workspace.

## Colors

The palette is built on a foundation of high-contrast neutrals to ensure a crisp, enterprise-grade feel. 

- **Primary (Indigo):** Used for primary actions, active states, and focus indicators. It provides a sense of reliability and technical authority.
- **Surface Tiers:** Pure white is used for the main content areas to maximize light, while `Surface Dim` (#F8FAFC) provides subtle structural separation for sidebars and secondary panels.
- **Typography:** Deep Slate (#1e293b) is used for body text to ensure WCAG AAA compliance and reduce eye strain compared to pure black.
- **Borders:** A consistent light gray (#e2e8f0) defines the architecture, replacing heavy shadows for a flatter, more modern "sheet" aesthetic.

## Typography

This design system utilizes **Geist** for its entire typographic scale. Geist’s geometric rigor and generous x-height make it ideal for data-dense enterprise applications.

- **Headlines:** Use tighter letter spacing and semi-bold weights to create a strong visual anchor.
- **Body:** Standardized at 14px for most interface text to balance density and readability.
- **Labels:** Used for metadata, tags, and small captions, often utilizing medium weights for clarity at small scales.
- **Mobile Adjustments:** For screens below 768px, `display-lg` should scale down to 32px and `headline-lg` to 24px to prevent excessive wrapping.

## Layout & Spacing

The layout follows a **Fluid-Fixed Hybrid** model. Navigation and sidebars are fixed in width, while the main content area utilizes a fluid 12-column grid.

- **Base Unit:** A 4px baseline grid ensures consistent vertical rhythm.
- **Margins:** Use 24px (lg) margins for desktop views and 16px (md) for mobile.
- **Grid:** On desktop, use a 12-column grid with 20px gutters. On tablet, switch to 8 columns. On mobile, use a single column with no gutters.
- **Alignment:** All components must snap to the 4px grid to maintain the "technical" precision of the brand.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Subtle Outlines** rather than aggressive shadows.

- **Level 0 (Base):** `Surface Dim` (#F8FAFC) used for the background of the application.
- **Level 1 (Card/Sheet):** Pure White (#FFFFFF) with a 1px border (#e2e8f0). This is the standard container for all content.
- **Level 2 (Dropdowns/Modals):** Pure White with a soft, diffused shadow: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`.
- **Interactions:** Hover states on interactive elements should shift the background color to a slightly darker gray or use a thin primary-colored border.

## Shapes

The design system employs a **Rounded** (Level 2) shape language to soften the technical nature of the typography and colors.

- **Standard (0.5rem):** Used for buttons, input fields, and small cards.
- **Large (1rem):** Used for main content containers and modals.
- **Extra Large (1.5rem):** Reserved for large featured elements or "empty state" illustrations.
- **Interactive States:** Focus rings should follow the component's border radius with a 2px offset.

## Components

- **Buttons:** Primary buttons use a solid Indigo background with white text. Secondary buttons use a white background with a #e2e8f0 border and slate text. Ghost buttons are borderless.
- **Input Fields:** 1px border (#e2e8f0) that transitions to Primary Indigo on focus. Use `body-md` for input text and `label-md` for field labels.
- **Chips/Badges:** Use a subtle background (e.g., 10% opacity of the status color) with a darker version of that color for text. Radius should be set to `rounded-lg` for a pill-like appearance.
- **Cards:** White background, 1px #e2e8f0 border, no shadow unless hovered. Headers inside cards should have a bottom border to separate content.
- **Lists:** Clean rows with 12px vertical padding. Use `Surface Dim` on hover to indicate interactivity. 
- **Checkboxes & Radios:** Use the Primary Indigo for the checked state. Checkboxes should have a 4px radius; radios are always circular.
- **Data Tables:** High-density, 8px cell padding, with a `Surface Dim` header row.