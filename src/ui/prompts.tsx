import React, { useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import type { Palette } from '../core/colors.js'
import type { ProjectView } from '../core/items.js'
import { ProjectBox } from './ProjectBox.js'

export function TextField({
  label,
  initial,
  onSubmit,
  onCancel,
}: {
  label: string
  initial: string
  onSubmit: (value: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initial)
  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) onCancel()
    else if (key.return) {
      if (value.trim()) onSubmit(value.trim())
    } else if (key.backspace || key.delete) setValue((v) => v.slice(0, -1))
    else if (input && !key.ctrl && !key.meta && !key.tab) setValue((v) => v + input)
  })
  return (
    <Box>
      <Text bold>{label} </Text>
      <Text>{value}</Text>
      <Text inverse> </Text>
    </Box>
  )
}

export function Confirm({
  question,
  defaultYes = false,
  onAnswer,
  onCancel,
  standalone = false,
}: {
  question: string
  defaultYes?: boolean
  onAnswer: (yes: boolean) => void
  onCancel: () => void
  /** Quitte Ink après la réponse (usage hors d'un flux plus large). */
  standalone?: boolean
}) {
  const { exit } = useApp()
  const done = (f: () => void) => {
    f()
    if (standalone) exit()
  }
  useInput((input, key) => {
    const c = input.toLowerCase()
    if (key.escape || (key.ctrl && c === 'c')) done(onCancel)
    else if (key.return) done(() => onAnswer(defaultYes))
    else if (c === 'o' || c === 'y') done(() => onAnswer(true))
    else if (c === 'n') done(() => onAnswer(false))
  })
  return (
    <Text>
      <Text bold>{question}</Text> {defaultYes ? '(O/n)' : '(o/N)'}
    </Text>
  )
}

export interface ColorEntry {
  name: string
  hex: string
}

export function paletteEntries(palette: Palette): ColorEntry[] {
  return Object.entries(palette).map(([name, hex]) => ({ name, hex }))
}

export function ColorPicker({
  entries,
  initialIndex = 0,
  previewName,
  previewRepos,
  onSubmit,
  onCancel,
}: {
  entries: ColorEntry[]
  initialIndex?: number
  previewName: string
  previewRepos: string[]
  onSubmit: (entry: ColorEntry) => void
  onCancel: () => void
}) {
  const [index, setIndex] = useState(initialIndex)
  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) onCancel()
    else if (key.return) onSubmit(entries[index]!)
    else if (key.upArrow) setIndex((i) => (i - 1 + entries.length) % entries.length)
    else if (key.downArrow) setIndex((i) => (i + 1) % entries.length)
  })
  const hovered = entries[index]!
  const preview: ProjectView = {
    name: previewName,
    path: '',
    color: hovered.hex,
    warnings: [],
    exists: true,
    repos: previewRepos.slice(0, 5).map((name) => ({ name, path: name })),
  }
  return (
    <Box flexDirection="column">
      <Text bold>Couleur du projet (↑↓ choisir · Entrée valider) :</Text>
      <Box>
        <Box flexDirection="column" marginRight={3}>
          {entries.map((e, i) => (
            <Text key={e.name} bold={i === index}>
              {i === index ? '› ' : '  '}
              <Text color={e.hex}>■ {e.name}</Text>
            </Text>
          ))}
        </Box>
        <ProjectBox project={preview} repos={preview.repos} titleSelected={false} empty />
      </Box>
    </Box>
  )
}

export function ProjectSelect({
  projects,
  onSubmit,
  onCancel,
}: {
  projects: { name: string; color: string; path: string }[]
  onSubmit: (index: number) => void
  onCancel: () => void
}) {
  const { exit } = useApp()
  const [index, setIndex] = useState(0)
  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      onCancel()
      exit()
    } else if (key.return) {
      onSubmit(index)
      exit()
    } else if (key.upArrow) setIndex((i) => (i - 1 + projects.length) % projects.length)
    else if (key.downArrow) setIndex((i) => (i + 1) % projects.length)
  })
  return (
    <Box flexDirection="column">
      <Text bold>Projet à retirer (↑↓ choisir · Entrée valider) :</Text>
      {projects.map((p, i) => (
        <Text key={p.path + p.name} bold={i === index}>
          {i === index ? '› ' : '  '}
          <Text color={p.color}>■ {p.name}</Text> <Text dimColor>{p.path}</Text>
        </Text>
      ))}
    </Box>
  )
}
