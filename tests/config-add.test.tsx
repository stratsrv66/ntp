import React from 'react'
import path from 'node:path'
import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'
import { ConfigAdd, type AddResult } from '../src/ui/ConfigAdd.js'
import { DEFAULT_PALETTE } from '../src/core/colors.js'
import { mkRepo, tick, tmpDir } from './helpers.js'

async function type(stdin: { write: (s: string) => void }, s: string) {
  stdin.write(s)
  await tick()
}

describe('ConfigAdd', () => {
  it('nom prérempli, couleur choisie avec ↓, résultat renvoyé', async () => {
    const dir = path.join(tmpDir(), 'payment')
    mkRepo(dir, 'api')
    let result: AddResult | null | undefined
    const { stdin, lastFrame } = render(
      <ConfigAdd cwd={dir} palette={DEFAULT_PALETTE} findExisting={() => undefined} onResult={(r) => (result = r)} />,
    )
    await tick()
    expect(lastFrame()).toContain('Repos détectés (1)')
    expect(lastFrame()).toContain('Nom du projet : payment')
    await type(stdin, '\r')
    expect(lastFrame()).toContain('■ rouge')
    await type(stdin, '\u001B[B') // rose
    await type(stdin, '\r')
    expect(result).toEqual({ dir, name: 'payment', color: 'rose' })
  })

  it('Échap annule sans résultat', async () => {
    const dir = tmpDir()
    mkRepo(dir, 'api')
    let result: AddResult | null | undefined
    const { stdin } = render(
      <ConfigAdd cwd={dir} palette={DEFAULT_PALETTE} findExisting={() => undefined} onResult={(r) => (result = r)} />,
    )
    await tick()
    await type(stdin, '\u001B')
    await tick(80)
    expect(result).toBeNull()
  })

  it('dossier sans repo : demande confirmation', async () => {
    const dir = tmpDir()
    const { lastFrame } = render(
      <ConfigAdd cwd={dir} palette={DEFAULT_PALETTE} findExisting={() => undefined} onResult={() => {}} />,
    )
    await tick()
    expect(lastFrame()).toContain('Aucun repo git détecté')
  })

  it('cwd est un repo : propose le dossier parent', async () => {
    const parent = tmpDir()
    const repo = mkRepo(parent, 'solo')
    let result: AddResult | null | undefined
    const { stdin, lastFrame } = render(
      <ConfigAdd cwd={repo} palette={DEFAULT_PALETTE} findExisting={() => undefined} presetName="P" presetColor="vert" onResult={(r) => (result = r)} />,
    )
    await tick()
    expect(lastFrame()).toContain('dossier parent')
    await type(stdin, 'o')
    expect(result).toEqual({ dir: parent, name: 'P', color: 'vert' })
  })
})
