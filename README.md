# ColorMind

Color palette generator and harmony analyzer with a dark cosmic theme.

Hit **spacebar** to generate palettes, lock the colors you like, and explore harmony relationships — all from a single page with an animated starfield background.

## Features

- **Palette Generation** — 5-color palettes using golden ratio hue distribution. Lock individual swatches to keep colors you like while regenerating the rest.
- **Harmony Analysis** — Pick a base color and see all 5 harmony types: complementary, analogous, triadic, split-complementary, and tetradic. Apply any harmony directly to the palette.
- **Save & Export** — Save palettes to localStorage with custom names. Export your entire collection as JSON.
- **WCAG Contrast** — Every swatch shows its contrast ratio against white. Text color auto-adapts for readability.
- **Copy Anywhere** — One-click copy for HEX and RGB values on any color.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Icons | Lucide React |
| State | `useReducer` (palette) + `useState` (saved palettes) |
| Storage | localStorage — no backend |

No router, no Context API — single page with tabs and props-only state passing.

## Getting Started

```bash
git clone https://github.com/TungSeven30/colors-help.git
cd colors-help
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
├── lib/
│   ├── color.ts          # HSL/RGB/HEX conversion, WCAG contrast, palette generation
│   ├── harmony.ts        # 5 harmony type calculations
│   ├── storage.ts        # localStorage persistence + JSON export
│   └── utils.ts          # Tailwind class merging (cn)
├── hooks/
│   ├── use-palette.ts    # useReducer — generate, lock, set, load
│   └── use-saved-palettes.ts  # useState + localStorage sync
├── components/
│   ├── PaletteGenerator  # Main palette UI + spacebar shortcut
│   ├── ColorSwatch       # Individual color with lock/copy/contrast
│   ├── HarmonyAnalyzer   # Base color picker + harmony grid
│   ├── HarmonyGroup      # Single harmony type display
│   ├── SavedPalettes     # Saved palette grid + export
│   ├── PaletteCard       # Individual saved palette card
│   ├── StarfieldCanvas   # Animated canvas background
│   ├── CopyButton        # Reusable copy-to-clipboard
│   └── ui/               # shadcn/ui primitives
└── App.tsx               # Root — tabs + state wiring
```

## Usage Guide

### Finding a palette from scratch

Hit spacebar to roll through random palettes until something clicks. The golden ratio math means the colors are already balanced — they won't clash. When you see a color you love, lock it (click the lock icon), then keep generating until the rest of the palette falls into place.

### Building a UI color system

Most apps need 5 roles — primary action color, secondary/accent, background, surface/card, and text. Once you've locked in a palette, map those 5 swatches to those roles. Copy the hex values directly into your Tailwind config, CSS variables, or whatever your app uses.

### Checking accessibility before you ship

Every swatch shows a WCAG contrast ratio against white. If you're putting text on a colored background, that number tells you if it's readable. Below 4.5:1 means small text will be hard to read. Below 3:1 means even large text fails. You can catch accessibility issues before writing any code.

### Exploring color relationships

Switch to the Harmony tab, paste in your brand's primary color, and instantly see what complementary, analogous, triadic, split-comp, and tetradic palettes look like. This is useful when you already have one color (like a client's brand color) and need to build a full scheme around it.

### Saving and comparing options

Save multiple palettes with descriptive names ("dark mode attempt 2", "landing page warm"), then flip through them in the Saved tab. Export the whole collection as JSON to share with a teammate or feed into a build tool.

### Quick workflow

1. Generate until you find a vibe
2. Lock colors, refine the rest
3. Check contrast ratios for accessibility
4. Save it, copy the hex codes
5. Paste into your app's theme config

## How It Works

**Palette generation** distributes hues using the golden ratio (0.618...) for visually pleasing spacing, with randomized saturation (55-85%) and lightness (45-70%). Locked colors are preserved across regenerations.

**Harmony calculations** apply standard hue offsets to a base color — 180 degrees for complementary, +/-30 degrees for analogous, etc.

**Contrast ratios** follow the WCAG formula with correct sRGB linearization (piecewise at the 0.03928 threshold). HSL values are rounded to integers at conversion boundaries to prevent floating-point drift.

## License

MIT
