# Design System Document: The Hyper-Local Pulse

## 1. Overview & Creative North Star: "The Kinetic Curator"
This design system is built to bridge the gap between high-energy community action and professional reliability. Our Creative North Star is **The Kinetic Curator**. Unlike standard ticketing platforms that feel like sterile spreadsheets, this system treats local events as premium editorial content. 

We achieve this through **Intentional Asymmetry** and **Tonal Depth**. By breaking the rigid 12-column grid with overlapping elements and shifting containers, we mimic the organic movement of a bustling neighborhood. The goal is to move beyond "booking a ticket" and toward "claiming a space" in the community.

---

## 2. Colors & Surface Philosophy
The palette utilizes high-contrast pairings to drive energy while maintaining a sophisticated "Neo-Professional" foundation.

### Palette Strategy
- **Primary (`#ab2d00`):** Energetic Orange. Use this for action-oriented moments. To avoid a "flat" look, leverage `primary-container` (`#ff7851`) as a secondary fill to create heat maps of interest.
- **Secondary (`#4052b6`):** Deep Indigo. This provides the "Professional" anchor. It represents the night-life and the reliability of the platform.
- **Tertiary (`#00675d`):** Fresh Teal. Used for "Belonging" moments—community tags, success states, and verified organizers.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Traditional lines create "boxes," and boxes feel like chores. 
- **Definition through Shift:** Define boundaries solely through background color shifts. A `surface-container-low` (`#ffedeb`) section sitting on a `surface` (`#fff4f3`) background provides all the structure needed without the visual clutter of a stroke.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of "Digital Vellum." 
- **The Nesting Principle:** To create focus, place a `surface-container-lowest` (#ffffff) card inside a `surface-container` (#ffe1e0) wrapper. 
- **The Glass & Gradient Rule:** For floating navigation or modal overlays, use **Glassmorphism**. Apply `surface` at 80% opacity with a `24px` backdrop-blur. This ensures the vibrant community colors bleed through the UI, making the app feel alive.

---

## 3. Typography: The Editorial Voice
We use a high-contrast scale to emphasize discovery and hierarchy.

### The Typeface Pairing
- **Display & Headlines (Plus Jakarta Sans):** A modern, geometric sans-serif with a wide stance. It feels youthful yet authoritative. 
- **Body & Labels (Manrope):** A highly functional sans-serif with excellent legibility at small scales, providing the "Professional" counterweight to the bold headlines.

### Hierarchy Highlights
- **Display-LG (3.5rem):** Use for hero "Discover" moments. Letter-spacing should be set to `-0.02em` to create a tight, editorial impact.
- **Title-LG (1.375rem):** The workhorse for event titles. 
- **Label-SM (0.6875rem):** Used for metadata (dates, price caps). Always set in All Caps with `0.05em` tracking to maintain a premium feel.

---

## 4. Elevation & Depth
In this system, "Elevation" is a feeling, not a drop-shadow preset.

### Tonal Layering
Depth is achieved by stacking `surface-container` tiers (Lowest to Highest). A `surface-container-high` (`#ffdad8`) element naturally feels closer to the user than `surface-dim` (`#ffc7c4`).

### Ambient Shadows
Shadows must be "unseen." Use the following logic:
- **Shadow Color:** Tint the shadow with `on-surface` (`#4e2120`) at 5% opacity. Never use pure black or grey.
- **Diffusion:** Large blur values (e.g., `32px` blur for a `12px` offset) to mimic soft, natural light.

### The "Ghost Border" Fallback
If accessibility requires a container boundary, use a **Ghost Border**: The `outline-variant` (`#e09c99`) token at **15% opacity**. It should be felt, not seen.

---

## 5. Components & Interaction Patterns

### Buttons (The "Belong" Action)
- **Primary:** Use a subtle vertical gradient from `primary` (`#ab2d00`) to `primary-dim` (`#962700`). Use `rounded-full` (9999px) to emphasize the youthful, friendly vibe.
- **Secondary:** Indigo `secondary` text on a `secondary-container` fill. No border.

### Input Fields
- **State:** Use `surface-container-lowest` for the field background to "punch out" of the page.
- **Focus:** Transition the "Ghost Border" to a 2px `primary` stroke.

### Cards & Lists (The Feed)
- **The Forbidden Divider:** Never use horizontal lines between list items. Use `1.5rem` (xl) vertical spacing and a subtle toggle between `surface` and `surface-container-low` backgrounds to denote list item changes.
- **Roundedness:** All event cards must use `rounded-xl` (1.5rem) to maintain the "Soft Professionalism" aesthetic.

### Signature Component: The "Spotlight" Chip
A custom chip for featured events using a `tertiary` to `tertiary-container` gradient. This provides a visual "pop" that signals high-priority community content.

---

## 6. Do’s and Don’ts

### Do:
- **Use "White" Space Boldly:** Our `background` is a warm off-white (`#fff4f3`). Use generous margins (32px+) to let the typography breathe.
- **Overlap Elements:** Let event images slightly break the container of their parent section to create a sense of movement.
- **Color-Code by Intent:** Use `primary` for "Booking," `secondary` for "Browsing," and `tertiary` for "Belonging/Community."

### Don’t:
- **Don't use 100% Black:** All "black" text should use `on-surface` (`#4e2120`) to keep the palette warm and cohesive.
- **Don't use Sharp Corners:** Avoid `none` or `sm` roundedness. It breaks the "Belonging" ethos.
- **Don't use Default Grids:** If a row has three cards, try making the first card slightly larger (editorial emphasis) rather than three equal boxes.

### Accessibility Note:
While we lean into subtle tonal shifts, always ensure the contrast ratio between text (`on-surface`) and its immediate background (`surface-container`) meets WCAG AA standards. When in doubt, increase the depth of the `on-surface-variant`.