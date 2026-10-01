export type Palette = Record<string, string>

export const DEFAULT_PALETTE: Palette = {
  rouge: '#ef4444',
  rose: '#ec4899',
  orange: '#f97316',
  jaune: '#eab308',
  vert: '#22c55e',
  cyan: '#06b6d4',
  bleu: '#3b82f6',
  violet: '#8b5cf6',
  gris: '#9ca3af',
}

export const FALLBACK_COLOR = '#9ca3af'

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
export const isHex = (s: string) => HEX.test(s)

// Noms de couleurs acceptés par chalk/Ink.
const INK_NAMES = new Set([
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'grey',
  'blackBright', 'redBright', 'greenBright', 'yellowBright', 'blueBright',
  'magentaBright', 'cyanBright', 'whiteBright',
])

export interface ResolvedColor {
  color: string
  warning?: string
}

/** Nom de palette, hex direct ou nom Ink. Inconnu → gris + avertissement. */
export function resolveColor(value: string, palette: Palette): ResolvedColor {
  if (Object.hasOwn(palette, value)) return { color: palette[value]! }
  if (isHex(value) || INK_NAMES.has(value)) return { color: value }
  return { color: FALLBACK_COLOR, warning: `couleur inconnue « ${value} »` }
}
