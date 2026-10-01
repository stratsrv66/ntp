import React, { useEffect, useState } from 'react'
import path from 'node:path'
import { Box, Text, useApp } from 'ink'
import type { Palette } from '../core/colors.js'
import { isGitRepo, scanRepos } from '../core/repos.js'
import { ColorPicker, Confirm, TextField, paletteEntries } from './prompts.js'

export interface AddResult {
  dir: string
  name: string
  color: string
}

interface Props {
  cwd: string
  palette: Palette
  /** Projet déjà configuré pour ce dossier (édition). */
  findExisting: (dir: string) => { name: string; color: string } | undefined
  presetName?: string
  presetColor?: string
  onResult: (r: AddResult | null) => void
}

type Phase = 'parent' | 'norepo' | 'name' | 'color' | 'done'

export function ConfigAdd({ cwd, palette, findExisting, presetName, presetColor, onResult }: Props) {
  const { exit } = useApp()
  const [dir, setDir] = useState(cwd)
  const [name, setName] = useState<string | undefined>(presetName)
  const [color, setColor] = useState<string | undefined>(presetColor)

  const afterDir = (d: string, hasRepos: boolean, n = name, c = color): Phase =>
    !hasRepos ? 'norepo' : afterWarn(n, c)
  const afterWarn = (n = name, c = color): Phase => (n === undefined ? 'name' : c === undefined ? 'color' : 'done')

  const [phase, setPhase] = useState<Phase>(() =>
    isGitRepo(cwd) ? 'parent' : afterDir(cwd, scanRepos(cwd).length > 0),
  )

  const repos = scanRepos(dir)
  const existing = findExisting(dir)
  const cancel = () => {
    onResult(null)
    exit()
  }

  useEffect(() => {
    if (phase === 'done' && name !== undefined && color !== undefined) {
      onResult({ dir, name, color })
      exit()
    }
  }, [phase])

  const entries = paletteEntries(palette)
  const currentColor = color ?? existing?.color
  if (currentColor && !entries.some((e) => e.name === currentColor || e.hex === currentColor)) {
    entries.unshift({ name: currentColor, hex: currentColor })
  }
  const initialIndex = Math.max(0, entries.findIndex((e) => e.name === currentColor || e.hex === currentColor))

  return (
    <Box flexDirection="column">
      <Text>
        <Text bold>Dossier : </Text>
        {dir}
      </Text>
      <Text bold>Repos détectés ({repos.length}) :</Text>
      {repos.length === 0 ? <Text dimColor>  (aucun)</Text> : repos.slice(0, 12).map((r) => <Text key={r}>  {r}</Text>)}
      {repos.length > 12 && <Text dimColor>  … et {repos.length - 12} autres</Text>}
      {existing && (
        <Text color="yellow">⚠ Ce dossier est déjà dans la config (« {existing.name} ») : modification.</Text>
      )}
      <Box marginTop={1}>
        {phase === 'parent' && (
          <Confirm
            defaultYes
            question={`Ce dossier est lui-même un repo git. Ajouter plutôt le dossier parent (${path.dirname(dir)}) ?`}
            onCancel={cancel}
            onAnswer={(yes) => {
              const d = yes ? path.dirname(dir) : dir
              setDir(d)
              setPhase(afterDir(d, scanRepos(d).length > 0))
            }}
          />
        )}
        {phase === 'norepo' && (
          <Confirm
            question="Aucun repo git détecté dans ce dossier. L'ajouter quand même ?"
            onCancel={cancel}
            onAnswer={(yes) => (yes ? setPhase(afterWarn()) : cancel())}
          />
        )}
        {phase === 'name' && (
          <TextField
            label="Nom du projet :"
            initial={existing?.name ?? path.basename(dir)}
            onCancel={cancel}
            onSubmit={(v) => {
              setName(v)
              setPhase(afterWarn(v))
            }}
          />
        )}
        {phase === 'color' && (
          <ColorPicker
            entries={entries}
            initialIndex={initialIndex}
            previewName={name ?? path.basename(dir)}
            previewRepos={repos}
            onCancel={cancel}
            onSubmit={(e) => {
              const chosen = Object.hasOwn(palette, e.name) ? e.name : e.hex
              setColor(chosen)
              setPhase('done')
            }}
          />
        )}
      </Box>
    </Box>
  )
}
