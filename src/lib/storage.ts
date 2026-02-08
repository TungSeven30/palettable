export interface SavedPalette {
  id: string
  name: string
  colors: string[]
  createdAt: string
}

const STORAGE_KEY = 'palettable-palettes'

export function loadPalettes(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedPalette[]) : []
  } catch {
    return []
  }
}

export function savePalettes(palettes: SavedPalette[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes))
}

export function exportPalettesJSON(palettes: SavedPalette[]): void {
  const blob = new Blob([JSON.stringify(palettes, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'palettable-palettes.json'
  a.click()
  URL.revokeObjectURL(url)
}
