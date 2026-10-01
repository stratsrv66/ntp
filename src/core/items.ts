import fs from 'node:fs'
import type { Config } from './config.js'
import { getPalette, resolveProjectPath } from './config.js'
import { resolveColor } from './colors.js'
import { isGitRepo, scanRepos } from './repos.js'
import path from 'node:path'

export interface RepoEntry {
  name: string
  path: string
}

export interface ProjectView {
  name: string
  path: string
  color: string
  warnings: string[]
  /** Le dossier du projet existe sur le disque. */
  exists: boolean
  repos: RepoEntry[]
}

/** Élément recherchable : un repo ou un projet. Point d'extension (frecency, git…). */
export interface Item {
  id: string
  kind: 'project' | 'repo'
  label: string
  path: string
  project: string
}

/** Scanne le disque (à chaque lancement) et prépare la vue. */
export function buildProjects(config: Config, home?: string): ProjectView[] {
  const palette = getPalette(config)
  return config.projects.map((p) => {
    const abs = resolveProjectPath(p.path, home)
    const { color, warning } = resolveColor(p.color, palette)
    const warnings = warning ? [warning] : []
    const exists = fs.existsSync(abs)
    if (!exists) warnings.push(`dossier introuvable : ${p.path}`)
    const repos: RepoEntry[] = exists
      ? scanRepos(abs).map((name) => ({ name, path: path.join(abs, name) }))
      : []
    // Repos ajoutés à la main (`ntp config project <nom> add`), dédoublonnés par chemin.
    for (const extra of p.repos ?? []) {
      const r = resolveProjectPath(extra, home)
      if (!isGitRepo(r)) warnings.push(`repo introuvable : ${extra}`)
      else if (!repos.some((x) => x.path === r)) repos.push({ name: path.basename(r), path: r })
    }
    repos.sort((a, b) => a.name.localeCompare(b.name))
    return { name: p.name, path: abs, color, warnings, exists, repos }
  })
}

/** Ajoute, après `matched`, les repos des projets qui y figurent (chercher un projet révèle ses repos). */
export function withProjectRepos(matched: readonly Item[], items: readonly Item[]): Item[] {
  const projects = new Set(matched.filter((i) => i.kind === 'project').map((i) => i.project))
  const seen = new Set(matched.map((i) => i.id))
  return [...matched, ...items.filter((i) => i.kind === 'repo' && projects.has(i.project) && !seen.has(i.id))]
}

export function buildItems(projects: readonly ProjectView[]): Item[] {
  const items: Item[] = []
  for (const p of projects) {
    if (p.exists) {
      items.push({ id: `p:${p.path}`, kind: 'project', label: p.name, path: p.path, project: p.name })
    }
    for (const r of p.repos) {
      items.push({ id: `r:${r.path}`, kind: 'repo', label: r.name, path: r.path, project: p.name })
    }
  }
  return items
}
