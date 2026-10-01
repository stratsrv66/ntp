import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DEFAULT_PALETTE, type Palette } from './colors.js'
import { collapseHome, expandTilde } from './paths.js'

export interface ProjectConfig {
  name: string
  path: string
  color: string
  /** Repos ajoutés à la main, en plus de ceux détectés dans `path`. */
  repos?: string[]
}

export interface Config {
  colors?: Palette
  projects: ProjectConfig[]
}

export class ConfigError extends Error {}

export function configPath(home: string = os.homedir()): string {
  return path.join(home, '.config', 'ntp', 'config.json')
}

export const EXAMPLE_CONFIG: Config = {
  colors: DEFAULT_PALETTE,
  projects: [{ name: 'Payment', path: '~/dev/payment', color: 'vert' }],
}

export function getPalette(config: Config): Palette {
  return config.colors ?? DEFAULT_PALETTE
}

export function resolveProjectPath(p: string, home: string = os.homedir()): string {
  return path.resolve(expandTilde(p, home))
}

/** Valide un objet JSON brut. Lève ConfigError avec un message précis. */
export function validateConfig(raw: unknown): Config {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ConfigError('la racine doit être un objet JSON')
  }
  const obj = raw as Record<string, unknown>
  let colors: Palette | undefined
  if (obj.colors !== undefined) {
    if (typeof obj.colors !== 'object' || obj.colors === null || Array.isArray(obj.colors)) {
      throw new ConfigError('"colors" doit être un objet { nom: "#hex" }')
    }
    colors = {}
    for (const [k, v] of Object.entries(obj.colors)) {
      if (typeof v !== 'string' || !v) throw new ConfigError(`"colors.${k}" doit être une chaîne`)
      colors[k] = v
    }
  }
  if (!Array.isArray(obj.projects)) throw new ConfigError('"projects" doit être un tableau')
  const projects = obj.projects.map((p, i): ProjectConfig => {
    if (typeof p !== 'object' || p === null) throw new ConfigError(`projects[${i}] doit être un objet`)
    const { name, path: pp, color } = p as Record<string, unknown>
    if (typeof name !== 'string' || !name.trim()) throw new ConfigError(`projects[${i}].name manquant`)
    if (typeof pp !== 'string' || !pp.trim()) throw new ConfigError(`projects[${i}].path manquant`)
    if (typeof color !== 'string' || !color.trim()) throw new ConfigError(`projects[${i}].color manquant`)
    const rawRepos = (p as Record<string, unknown>).repos
    if (rawRepos === undefined) return { name, path: pp, color }
    if (!Array.isArray(rawRepos) || rawRepos.some((r) => typeof r !== 'string' || !r.trim())) {
      throw new ConfigError(`projects[${i}].repos doit être un tableau de chemins`)
    }
    return { name, path: pp, color, repos: rawRepos as string[] }
  })
  return colors ? { colors, projects } : { projects }
}

export function parseConfig(text: string): Config {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e) {
    throw new ConfigError(`JSON invalide (${(e as Error).message})`)
  }
  return validateConfig(raw)
}

/** Charge la config ; lève ConfigError (fichier absent ou invalide). */
export function loadConfig(file: string = configPath()): Config {
  let text: string
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ConfigError(`fichier de configuration introuvable : ${file}`)
    }
    throw new ConfigError(`lecture impossible de ${file} : ${(e as Error).message}`)
  }
  try {
    return parseConfig(text)
  } catch (e) {
    throw new ConfigError(`${file} : ${(e as Error).message}`)
  }
}

/** Écriture atomique (fichier temporaire puis renommage), indentation 2. */
export function saveConfig(config: Config, file: string = configPath()): void {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2) + '\n')
  fs.renameSync(tmp, file)
}

export type AddRepoStatus = 'added' | 'already' | 'no-project'

/**
 * Ajoute un repo explicite à un projet (nom insensible à la casse). Pur : renvoie
 * une nouvelle config. `already` si le repo est un sous-dossier direct du projet
 * (déjà scanné) ou déjà listé.
 */
export function addRepoToProject(
  config: Config,
  projectName: string,
  repoPath: string,
  home: string = os.homedir(),
): { status: AddRepoStatus; config: Config } {
  const idx = config.projects.findIndex((p) => p.name.toLowerCase() === projectName.toLowerCase())
  if (idx < 0) return { status: 'no-project', config }
  const project = config.projects[idx]!
  const abs = path.resolve(repoPath)
  const scanned = path.dirname(abs) === resolveProjectPath(project.path, home)
  const listed = (project.repos ?? []).some((r) => resolveProjectPath(r, home) === abs)
  if (scanned || listed) return { status: 'already', config }
  const projects = [...config.projects]
  projects[idx] = { ...project, repos: [...(project.repos ?? []), collapseHome(abs, home)] }
  return { status: 'added', config: { ...config, projects } }
}

export function missingConfigMessage(reason: string, file: string = configPath()): string {
  return [
    `ntp : ${reason}`,
    '',
    `Créez la configuration avec :  ntp config add   (depuis le dossier à ajouter)`,
    `ou écrivez ${file}, par exemple :`,
    '',
    JSON.stringify(EXAMPLE_CONFIG, null, 2),
    '',
  ].join('\n')
}

export { collapseHome }
