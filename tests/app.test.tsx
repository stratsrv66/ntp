import React from 'react'
import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'
import { App } from '../src/ui/App.js'
import type { ProjectView } from '../src/core/items.js'
import { tick } from './helpers.js'

const projects: ProjectView[] = [
  {
    name: 'Payment', path: '/dev/payment', color: '#22c55e', warnings: [], exists: true,
    repos: [
      { name: 'payment-api', path: '/dev/payment/payment-api' },
      { name: 'payment-gateway', path: '/dev/payment/payment-gateway' },
    ],
  },
  {
    name: 'Sportsbook', path: '/dev/sportsbook', color: '#3b82f6', warnings: [], exists: true,
    repos: [{ name: 'odds', path: '/dev/sportsbook/odds' }],
  },
]
const missing: ProjectView = {
  name: 'Gone', path: '/nope', color: '#9ca3af', warnings: ['dossier introuvable : ~/nope'], exists: false, repos: [],
}

async function type(stdin: { write: (s: string) => void }, s: string) {
  stdin.write(s)
  await tick()
}

describe('App', () => {
  it('saisie filtre les projets, Tab complète, Entrée valide', async () => {
    let chosen: string | undefined
    const { stdin, lastFrame } = render(<App projects={projects} onSelect={(p) => (chosen = p)} />)
    await tick()
    expect(lastFrame()).toContain('Sportsbook')

    await type(stdin, 'pa')
    expect(lastFrame()).toContain('payment-api')
    expect(lastFrame()).not.toContain('Sportsbook')

    await type(stdin, '\t') // → préfixe commun (casse du premier libellé : « Payment »)
    expect(lastFrame()).toContain('› Payment')

    await type(stdin, '\t') // déjà au préfixe → correspondance suivante
    expect(lastFrame()).toContain('› Payment')
    await type(stdin, '\r')
    expect(chosen).toBe('/dev/payment/payment-api')
  })

  it('Entrée sur un projet va dans le dossier du projet', async () => {
    let chosen: string | undefined
    const { stdin } = render(<App projects={projects} onSelect={(p) => (chosen = p)} />)
    await tick()
    await type(stdin, 'sports')
    await type(stdin, '\r')
    expect(chosen).toBe('/dev/sportsbook')
  })

  it('chercher un projet affiche aussi ses repos, sélectionnables avec ↓', async () => {
    let chosen: string | undefined
    const { stdin, lastFrame } = render(<App projects={projects} onSelect={(p) => (chosen = p)} />)
    await tick()
    await type(stdin, 'sports')
    expect(lastFrame()).toContain('odds')
    expect(lastFrame()).not.toContain('payment-api')
    await type(stdin, '\u001B[B')
    await type(stdin, '\r')
    expect(chosen).toBe('/dev/sportsbook/odds')
  })

  it('aucun résultat → message, Entrée ne sélectionne rien', async () => {
    let chosen: string | undefined
    const { stdin, lastFrame } = render(<App projects={projects} onSelect={(p) => (chosen = p)} />)
    await tick()
    await type(stdin, 'zzzz')
    expect(lastFrame()).toContain('Aucun repo trouvé')
    await type(stdin, '\r')
    expect(chosen).toBeUndefined()
  })

  it('requête initiale pré-remplie, ↓ change la sélection, Backspace efface', async () => {
    let chosen: string | undefined
    const { stdin, lastFrame } = render(<App projects={projects} initialQuery="payment-" onSelect={(p) => (chosen = p)} />)
    await tick()
    expect(lastFrame()).toContain('› payment-')
    await type(stdin, '\u001B[B')
    await type(stdin, '\r')
    expect(chosen).toBe('/dev/payment/payment-gateway')
    await type(stdin, '\x7f')
  })

  it('projet au dossier absent : avertissement au lieu d’un plantage', async () => {
    const { lastFrame } = render(<App projects={[projects[0]!, missing]} onSelect={() => {}} />)
    await tick()
    expect(lastFrame()).toContain('dossier introuvable')
  })

  it('Échap quitte sans rien sélectionner', async () => {
    let chosen: string | undefined
    const { stdin } = render(<App projects={projects} onSelect={(p) => (chosen = p)} />)
    await tick()
    await type(stdin, '\u001B')
    await tick(80)
    expect(chosen).toBeUndefined()
  })
})
