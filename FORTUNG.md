# Palettable — What I Built and What I Learned

## What Is This?

Palettable is a color palette generator and harmony analyzer with a dark cosmic theme. Think of it as a creative tool for designers and developers who need to quickly generate harmonious color palettes, understand color relationships, and save their favorites for later.

The app has three main features:
1. **Generator** — Generates 5-color palettes using the golden ratio for maximally distributed hues. You can lock individual colors and regenerate the rest (press spacebar!).
2. **Harmony Analyzer** — Pick any base color and instantly see its complementary, analogous, triadic, split-complementary, and tetradic harmonies.
3. **Saved Palettes** — Save palettes with names, load them back, delete them, or export everything as JSON.

---

## Technical Architecture

### The Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Build tool | Vite 7 | Instant HMR, native ESM, zero-config TypeScript |
| UI framework | React 18 | Component model, hooks for state |
| Styling | Tailwind CSS v4 + shadcn/ui | Utility-first CSS with polished component primitives |
| Language | TypeScript | Type safety across color math conversions |
| Icons | lucide-react | Consistent, tree-shakeable icon set |

### Project Structure

The codebase follows a clean separation of concerns:

```
src/
  lib/           ← Pure functions (no React, no side effects)
    color.ts     ← HSL/RGB/HEX math, contrast, palette generation
    harmony.ts   ← Color harmony calculations
    storage.ts   ← localStorage CRUD
  hooks/         ← React state management
    use-palette.ts        ← useReducer for 5 colors + lock states
    use-saved-palettes.ts ← useState + localStorage sync
  components/    ← UI components (bottom-up dependency order)
    ui/          ← shadcn primitives (button, card, tabs, etc.)
    StarfieldCanvas.tsx   ← Animated background
    ColorSwatch.tsx       ← Single color stripe
    PaletteGenerator.tsx  ← 5 swatches + controls
    HarmonyGroup.tsx      ← One harmony type row
    HarmonyAnalyzer.tsx   ← All harmony types
    PaletteCard.tsx       ← Saved palette card
    SavedPalettes.tsx     ← Grid of saved cards
    CopyButton.tsx        ← Copy-to-clipboard utility
  App.tsx        ← Shell: tabs, hooks, wiring
  main.tsx       ← React 18 createRoot entry
```

The key architectural insight: **pure math lives in `lib/`, React state lives in `hooks/`, and UI lives in `components/`**. This makes the color math testable without React, the hooks reusable across different UIs, and the components focused purely on presentation.

### How the Parts Connect

Think of it like a sandwich:

- **Bottom layer** (`lib/`): Pure functions. `color.ts` handles all the math — HSL-to-RGB conversions, hex parsing, WCAG contrast ratios, golden ratio palette generation. `harmony.ts` builds on `color.ts` to calculate harmony groups. `storage.ts` handles localStorage. None of these know React exists.

- **Middle layer** (`hooks/`): `usePalette` wraps `useReducer` to manage 5 colors and their lock states with actions like `generate`, `toggle_lock`, `set_color`, and `load`. `useSavedPalettes` wraps `useState` with localStorage sync.

- **Top layer** (`components/`): Each component gets data via props from `App.tsx`, which holds both hooks and wires everything together. No React Context needed — the component tree is only 2-3 levels deep, so props are clearer.

---

## Key Technical Decisions and Why

### Golden Ratio Conjugate for Hue Distribution

When generating random colors, you want them to be *visually distinct*. Using `Math.random()` for hues gives you clumps — sometimes three blues in a row. Instead, we use the golden ratio conjugate (0.618033...) to increment hues:

```typescript
hue = (hue + 360 * 0.618033988749895) % 360
```

This produces maximally distributed hues regardless of how many colors you generate. It's the same principle that sunflower seeds use to pack efficiently — each new seed (color) lands as far as possible from existing ones.

### useReducer over useState for Palette State

The palette has multiple coordinated state transitions: generating new colors must respect locks, loading a saved palette must clear all locks, setting a single color must preserve the rest. With `useState`, you'd need multiple state variables that could get out of sync. `useReducer` bundles all transitions into a single dispatch, making impossible states impossible.

### No Router, No Context

The app is a single page with tabs. Adding React Router would be overhead for zero benefit — there are no URLs to share, no back button behavior needed. Similarly, React Context is overkill when the component tree is this shallow. Props are explicit, traceable, and don't require understanding a provider tree.

### Native `<input type="color">` for the Harmony Picker

Building a custom HSL color picker is tempting but unnecessary. The native color input works across all browsers, handles touch/mouse input, and looks native to each OS. We pair it with a hex text input for precise values.

### Tailwind CSS v4 — The New Syntax

Tailwind v4 dropped the `@tailwind` directives. Instead:
```css
@import "tailwindcss";
```

And theme customization uses `@theme inline` blocks that map CSS custom properties to Tailwind utility names. This is a significant departure from v3's `tailwind.config.js`.

---

## Bugs We Ran Into and How We Fixed Them

### 1. Spacebar Generating While Typing

**Problem**: Pressing spacebar to type in the palette name input also triggered palette generation.

**Fix**: The keyboard handler checks `e.target instanceof HTMLInputElement` before acting:
```typescript
if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
  e.preventDefault()
  onGenerate()
}
```

**Lesson**: Global keyboard shortcuts need target guards. This is easy to forget and incredibly annoying for users.

### 2. Canvas Not Cleaning Up

**Problem**: Navigating away and back created multiple `requestAnimationFrame` loops, each drawing stars on top of each other, causing increasing CPU usage.

**Fix**: The `useEffect` returns a cleanup function:
```typescript
return () => {
  cancelAnimationFrame(animId)
  observer.disconnect()
}
```

**Lesson**: Any `requestAnimationFrame` loop in a React component *must* be cancelled in cleanup. This is the canvas equivalent of unsubscribing from event listeners.

### 3. Shadcn Init Failing with Tailwind v4

**Problem**: `shadcn init` couldn't detect Tailwind because the CSS file didn't have `@import "tailwindcss"` yet, and the tsconfig didn't have path aliases.

**Fix**: Configure Tailwind and paths *before* running `shadcn init`:
1. Write `@import "tailwindcss"` to `index.css`
2. Add `baseUrl` and `paths` to tsconfig
3. Then run `shadcn init`

**Lesson**: Tooling order matters. Shadcn validates your setup before writing files. Set up the prerequisites first.

### 4. HSL Floating-Point Drift

**Problem**: Converting HSL -> RGB -> HSL repeatedly causes floating-point errors to accumulate. A hue of 120 becomes 119.99999 becomes 119.

**Fix**: Round to integers at each conversion boundary:
```typescript
return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
```

**Lesson**: Color math is inherently lossy. Round at boundaries, not inside calculations.

---

## Potential Pitfalls and How to Avoid Them

1. **Tailwind v4 migration confusion**: Don't mix v3 syntax (`@tailwind base/components/utilities`) with v4 (`@import "tailwindcss"`). The animation plugin is now `tw-animate-css`, not `tailwindcss-animate`.

2. **WCAG contrast calculation**: The sRGB linearization formula has a discontinuity at 0.03928. Get this wrong and your "contrast-aware text" will pick the wrong color on medium-brightness backgrounds.

3. **localStorage size limits**: We JSON-serialize all palettes. With 5 colors per palette, you'd need ~10,000 saved palettes to hit the ~5MB localStorage limit. Not a real risk, but worth knowing.

4. **Canvas resolution on Retina displays**: We're using `window.innerWidth/Height` for canvas dimensions. On Retina, this means the starfield is rendered at 1x and upscaled. For a subtle background effect, this is fine — it actually makes the stars look softer.

---

## What Good Engineers Think About

1. **Separation of concerns is a spectrum.** We could have put color math directly in components. We could have used a state management library. The right level of separation is the one that makes the code *navigable* without being *bureaucratic*. Three files in `lib/` is enough structure without creating a "utils" folder that becomes a junk drawer.

2. **Start with the data model.** The `HSLColor` and `RGBColor` types, the `SavedPalette` interface — these were written first. Once you know the shape of your data, the UI almost writes itself.

3. **Build bottom-up, verify top-down.** We built `CopyButton` before `ColorSwatch` before `PaletteGenerator`. Each component was immediately usable by its parent. But we verified by looking at the running app, not by unit testing button clicks.

4. **Don't abstract prematurely.** `padToFive()` is a 4-line function that lives in `App.tsx` because it's only used there. It doesn't need to be in a utils file. Three similar lines of code are better than a premature abstraction.

5. **Visual verification matters.** We caught layout issues, color contrast problems, and interaction bugs by actually looking at the app in a browser — not just checking that TypeScript compiled.

---

## Technologies Worth Learning From This Project

- **Tailwind CSS v4**: The new `@theme inline` system and CSS-first configuration
- **shadcn/ui**: Not a component library — a copy-paste system. You own the code, which means you can customize everything
- **WCAG contrast ratios**: The math behind accessible text colors
- **Golden ratio in generative design**: How mathematical constants produce aesthetically pleasing results
- **useReducer patterns**: When coordinated state transitions need guarantees that `useState` can't provide
- **Canvas animation in React**: The `useEffect` + `requestAnimationFrame` + cleanup pattern
