import React from 'react'
import { ConfigError, loadConfig, missingConfigMessage } from '../core/config.js'
import { buildItems, buildProjects } from '../core/items.js'
import { rank } from '../core/match.js'
import { App } from '../ui/App.js'
import { err, runInk } from './ink.js'

/** Chemin à écrire directement : une seule correspondance, ou une seule correspondance exacte. */
export function directTarget<T extends { label: string }>(query: string, items: readonly T[]): T | undefined {
  const results = rank(query, items)
  if (results.length === 1) return results[0]!.item
  const exact = results.filter((r) => r.kind === 'exact')
  return exact.length === 1 ? exact[0]!.item : undefined
}

/** Retourne le code de sortie ; écrit le chemin choisi sur stdout. */
export async function runSearch(args: string[]): Promise<number> {
  let config
  try {
    config = loadConfig()
  } catch (e) {
    if (!(e instanceof ConfigError)) throw e
    err(missingConfigMessage(e.message))
    return 1
  }
  const projects = buildProjects(config)
  const query = args.join(' ').trim()

  let chosen: string | undefined
  const direct = query ? directTarget(query, buildItems(projects)) : undefined
  if (direct) {
    chosen = direct.path
  } else {
    await runInk(<App projects={projects} initialQuery={query} onSelect={(p) => (chosen = p)} />)
  }
  if (chosen === undefined) return 1
  // Après le démontage complet d'Ink : le chemin seul, sans retour à la ligne.
  process.stdout.write(chosen)
  return 0
}
