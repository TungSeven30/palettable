import { useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StarfieldCanvas } from '@/components/StarfieldCanvas'
import { PaletteGenerator } from '@/components/PaletteGenerator'
import { HarmonyAnalyzer } from '@/components/HarmonyAnalyzer'
import { SavedPalettes } from '@/components/SavedPalettes'
import { usePalette } from '@/hooks/use-palette'
import { useSavedPalettes } from '@/hooks/use-saved-palettes'

/** Pad a harmony color array to 5 colors by repeating from the start */
function padToFive(colors: string[]): string[] {
  const result = [...colors]
  while (result.length < 5) {
    result.push(colors[result.length % colors.length])
  }
  return result.slice(0, 5)
}

export default function App() {
  const palette = usePalette()
  const saved = useSavedPalettes()

  const handleApplyHarmony = useCallback(
    (colors: string[]) => {
      palette.loadColors(padToFive(colors))
    },
    [palette],
  )

  const handleLoadSaved = useCallback(
    (colors: string[]) => {
      palette.loadColors(colors)
    },
    [palette],
  )

  return (
    <div className="min-h-screen relative">
      <StarfieldCanvas />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Palettable
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Color palette generator & harmony analyzer
          </p>
        </header>

        {/* Tabs */}
        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
            <TabsTrigger value="generator">Generator</TabsTrigger>
            <TabsTrigger value="harmony">Harmony</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>

          <TabsContent value="generator">
            <PaletteGenerator
              colors={palette.colors}
              locked={palette.locked}
              onGenerate={palette.generate}
              onToggleLock={palette.toggleLock}
              onSave={(name) => saved.save(name, palette.colors)}
            />
          </TabsContent>

          <TabsContent value="harmony">
            <HarmonyAnalyzer onApply={handleApplyHarmony} />
          </TabsContent>

          <TabsContent value="saved">
            <SavedPalettes
              palettes={saved.palettes}
              onLoad={handleLoadSaved}
              onDelete={saved.remove}
              onExport={saved.exportJSON}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
