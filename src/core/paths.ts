import os from 'node:os'
import path from 'node:path'

export function expandTilde(p: string, home: string = os.homedir()): string {
  if (p === '~') return home
  if (p.startsWith('~/')) return path.join(home, p.slice(2))
  return p
}

/** Réécrit un chemin sous le home avec `~`. */
export function collapseHome(p: string, home: string = os.homedir()): string {
  if (p === home) return '~'
  if (p.startsWith(home + path.sep)) return '~' + p.slice(home.length)
  return p
}
