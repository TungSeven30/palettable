import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import {
  parseColor,
  colorInfo,
  generatePalette,
  checkContrast,
  textColorForBackground,
  hexToRgb,
  contrastRatio,
} from './color.js'
import { getHarmonies } from './harmony.js'
import type { ColorInfo, ContrastResult } from './color.js'
import type { HarmonyResult } from './harmony.js'

const server = new Server(
  { name: 'palettable', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

// ── Tool definitions ─────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_palette',
      description:
        'Generate a color palette using golden ratio hue distribution. ' +
        'Colors are mathematically spaced for visual harmony. ' +
        'Lock specific positions to keep colors you like while regenerating the rest.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          count: {
            type: 'number',
            description: 'Number of colors to generate (2-8). Defaults to 5.',
          },
          locked: {
            type: 'object',
            description:
              'Colors to keep fixed. Map of position index to color value. ' +
              'Example: {"0": "#6C5CE7", "2": "#00CEC9"} keeps slots 0 and 2 while regenerating the rest.',
            additionalProperties: { type: 'string' },
          },
        },
      },
    },
    {
      name: 'get_harmonies',
      description:
        'Get all 5 color harmony types for a base color: complementary, analogous, ' +
        'triadic, split-complementary, and tetradic. Useful when you have one brand or ' +
        'primary color and need to build a full color scheme around it.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          color: {
            type: 'string',
            description:
              'Base color in any format: hex (#6C5CE7), rgb(108,92,231), or hsl(249,75%,63%)',
          },
        },
        required: ['color'],
      },
    },
    {
      name: 'check_contrast',
      description:
        'Check WCAG contrast ratio between two colors. Returns the ratio and ' +
        'pass/fail verdicts for AA and AAA compliance at normal and large text sizes. ' +
        'Use this to verify text is readable on a given background.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          foreground: {
            type: 'string',
            description: 'Text/foreground color in any format',
          },
          background: {
            type: 'string',
            description: 'Background color in any format',
          },
        },
        required: ['foreground', 'background'],
      },
    },
    {
      name: 'suggest_text_color',
      description:
        'Given a background color, returns the best text color (white or black) for ' +
        'maximum readability, along with the contrast ratio.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          background: {
            type: 'string',
            description: 'Background color in any format',
          },
        },
        required: ['background'],
      },
    },
    {
      name: 'convert_color',
      description:
        'Convert a color between formats. Accepts hex, RGB, or HSL input and ' +
        'returns all three representations.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          color: {
            type: 'string',
            description: 'Color in any format: hex (#6C5CE7), rgb(108,92,231), or hsl(249,75%,63%)',
          },
        },
        required: ['color'],
      },
    },
    {
      name: 'analyze_palette',
      description:
        'Analyze an existing palette for accessibility and color relationships. ' +
        'Pass in your current colors and get back: contrast ratios between all pairs, ' +
        'WCAG compliance verdicts, and a list of accessibility issues. ' +
        'Great for auditing a UI color scheme before shipping.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          colors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of colors to analyze (any format)',
          },
          background: {
            type: 'string',
            description:
              'Background color to check text contrast against. Defaults to #ffffff. ' +
              'Set to your actual background (e.g. #1a1a2e for dark themes).',
          },
        },
        required: ['colors'],
      },
    },
  ],
}))

// ── Tool handlers ────────────────────────────────────────────

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

function err(message: string) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }], isError: true }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'generate_palette': {
        const count = Math.min(8, Math.max(2, (args?.count as number) ?? 5))
        const rawLocked = (args?.locked ?? {}) as Record<string, string>

        // Parse locked colors
        const locked: Record<string, string> = {}
        for (const [k, v] of Object.entries(rawLocked)) {
          locked[k] = parseColor(v)
        }

        const hexes = generatePalette(count, locked)
        const colors = hexes.map((hex, i) => ({
          position: i,
          locked: locked[String(i)] !== undefined,
          ...colorInfo(hex),
        }))

        return ok({ count, colors })
      }

      case 'get_harmonies': {
        const hex = parseColor(args?.color as string)
        const base = colorInfo(hex)
        const harmonies = getHarmonies(hex).map((h: HarmonyResult) => ({
          type: h.type,
          label: h.label,
          colors: h.colors.map((c: string) => colorInfo(c)),
        }))

        return ok({ base, harmonies })
      }

      case 'check_contrast': {
        const fg = parseColor(args?.foreground as string)
        const bg = parseColor(args?.background as string)
        const result: ContrastResult = checkContrast(fg, bg)

        return ok({
          foreground: colorInfo(fg),
          background: colorInfo(bg),
          ...result,
          verdict: result.aaa_normal
            ? 'Excellent — passes AAA for all text'
            : result.aa_normal
              ? 'Good — passes AA for all text'
              : result.aa_large
                ? 'Acceptable — passes AA for large text only (18px+ bold or 24px+)'
                : 'Fail — insufficient contrast for any text use',
        })
      }

      case 'suggest_text_color': {
        const bg = parseColor(args?.background as string)
        const textHex = textColorForBackground(bg)
        const ratio = contrastRatio(hexToRgb(bg), hexToRgb(textHex))

        return ok({
          background: colorInfo(bg),
          recommended_text: colorInfo(textHex),
          contrast_ratio: ratio.toFixed(2),
        })
      }

      case 'convert_color': {
        const hex = parseColor(args?.color as string)
        return ok(colorInfo(hex))
      }

      case 'analyze_palette': {
        const rawColors = args?.colors as string[]
        if (!rawColors?.length) return err('colors array is required')

        const hexes = rawColors.map(parseColor)
        const bg = parseColor((args?.background as string) ?? '#ffffff')

        const colors: (ColorInfo & { position: number })[] = hexes.map((hex, i) => ({
          position: i,
          ...colorInfo(hex),
        }))

        // Contrast between every pair
        const pairs: {
          pair: [string, string]
          ratio: string
          aa_normal: boolean
          aa_large: boolean
        }[] = []
        for (let i = 0; i < hexes.length; i++) {
          for (let j = i + 1; j < hexes.length; j++) {
            const result = checkContrast(hexes[i], hexes[j])
            pairs.push({
              pair: [hexes[i], hexes[j]],
              ratio: result.ratio,
              aa_normal: result.aa_normal,
              aa_large: result.aa_large,
            })
          }
        }

        // Each color against the background
        const onBackground = hexes.map((hex) => {
          const result = checkContrast(hex, bg)
          const textHex = textColorForBackground(hex)
          return {
            color: hex,
            vs_background: result,
            suggested_text: textHex,
          }
        })

        // Collect issues
        const issues: string[] = []
        for (const p of pairs) {
          if (!p.aa_large) {
            issues.push(
              `${p.pair[0]} and ${p.pair[1]} have very low contrast (${p.ratio}:1) — unusable as text/background pair`,
            )
          }
        }
        for (const ob of onBackground) {
          if (!ob.vs_background.aa_normal) {
            issues.push(
              `${ob.color} on background ${bg} fails AA for normal text (${ob.vs_background.ratio}:1)`,
            )
          }
        }

        return ok({
          colors,
          background: colorInfo(bg),
          contrast_pairs: pairs,
          on_background: onBackground,
          issues: issues.length > 0 ? issues : ['No accessibility issues found.'],
        })
      }

      default:
        return err(`Unknown tool: ${name}`)
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e))
  }
})

// ── Start server ─────────────────────────────────────────────

const transport = new StdioServerTransport()
await server.connect(transport)
