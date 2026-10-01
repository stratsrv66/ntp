import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import chalk from 'chalk'
import { DEFAULT_PALETTE, resolveColor } from '../core/colors.js'
import {
  addRepoToProject,
  ConfigError,
  collapseHome,
  configPath,
  getPalette,
  loadConfig,
  missingConfigMessage,
  resolveProjectPath,
  saveConfig,
  type Config,
} from '../core/config.js'
import { buildProjects } from '../core/items.js'
import { isGitRepo, scanRepos } from '../core/repos.js'
import { expandTilde } from '../core/paths.js'
import { ConfigAdd } from '../ui/ConfigAdd.js'
import { Confirm, ProjectSelect } from '../ui/prompts.js'
import { err, runInk } from './ink.js'

const HELP = `Usage : ntp config <commande>

  add [--name <nom>] [--color <couleur>]   ajoute le dossier courant comme projet (alias : --add)
  list                                      liste les projets (couleur, chemin, nombre de repos)
  project <nom> add [<chemin>]              ajoute un repo (dossier courant par défaut) au projet
  remove [<nom>]                            retire un projet (avec confirmation)
  edit                                      ouvre le fichier de config dans $EDITOR (sinon open -t)
  path                                      affiche le chemin du fichier de config
  --help                                    affiche cette aide
`

function flag(args: string[], name: string): string | undefined {
  const i = args.findIndex((a) => a === name || a.startsWith(name + '='))
  if (i < 0) return undefined
  const a = args[i]!
  return a.includes('=') ? a.slice(a.indexOf('=') + 1) : args[i + 1]
}

function loadOrExit(): Config | null {
  try {
    return loadConfig()
  } catch (e) {
    if (!(e instanceof ConfigError)) throw e
    err(missingConfigMessage(e.message))
    return null
  }
}

const swatch = (hex: string) => chalk.hex(hex)('■')

/** Retourne le code de sortie. Rien n'est jamais écrit sur stdout. */
export async function runConfig(args: string[]): Promise<number> {
  const [sub, ...rest] = args
  switch (sub) {
    case undefined:
    case '--help':
    case '-h':
    case 'help':
      err(HELP)
      return 0
    case 'add':
    case '--add':
      return cmdAdd(rest)
    case 'list':
      return cmdList()
    case 'project':
      return cmdProject(rest)
    case 'remove':
      return cmdRemove(rest)
    case 'edit':
      return cmdEdit()
    case 'path':
      err(configPath())
      return 0
    default:
      err(`ntp config : commande inconnue « ${sub} »\n\n${HELP}`)
      return 1
  }
}

function cmdList(): number {
  const config = loadOrExit()
  if (!config) return 1
  if (config.projects.length === 0) {
    err('Aucun projet. Ajoutez-en un avec : ntp config add')
    return 0
  }
  const palette = getPalette(config)
  const views = buildProjects(config)
  config.projects.forEach((p, i) => {
    const v = views[i]!
    const { color } = resolveColor(p.color, palette)
    const missing = v.warnings.find((w) => w.startsWith('dossier introuvable'))
    err(
      `${swatch(color)} ${chalk.bold.hex(color)(p.name)}  ${p.color}  ${p.path}  ` +
        (missing ? chalk.yellow('⚠ dossier introuvable') : `${v.repos.length} repo${v.repos.length > 1 ? 's' : ''}`),
    )
  })
  return 0
}

async function cmdAdd(args: string[]): Promise<number> {
  const file = configPath()
  let config: Config | null = null
  if (fs.existsSync(file)) {
    config = loadOrExit()
    if (!config) return 1
  }
  const palette = config ? getPalette(config) : DEFAULT_PALETTE
  const presetName = flag(args, '--name')?.trim()
  const presetColor = flag(args, '--color')
  if (args.includes('--name') && !presetName) {
    err('ntp config add : --name attend une valeur')
    return 1
  }
  if (presetColor !== undefined && (!presetColor || resolveColor(presetColor, palette).warning)) {
    err(
      `ntp config add : couleur inconnue « ${presetColor ?? ''} ».\nCouleurs disponibles : ${Object.keys(palette).join(', ')} (ou un hex, ex. #4ade80)`,
    )
    return 1
  }

  const findExisting = (dir: string) => {
    const p = config?.projects.find((x) => resolveProjectPath(x.path) === dir)
    return p && { name: p.name, color: p.color }
  }

  let result: { dir: string; name: string; color: string } | null = null
  await runInk(
    <ConfigAdd
      cwd={process.cwd()}
      palette={palette}
      findExisting={findExisting}
      presetName={presetName}
      presetColor={presetColor}
      onResult={(r) => (result = r)}
    />,
  )
  if (!result) {
    err('Annulé, rien n\'a été écrit.')
    return 1
  }
  const { dir, name, color } = result as { dir: string; name: string; color: string }

  const next: Config = config ?? { colors: DEFAULT_PALETTE, projects: [] }
  const entry = { name, path: collapseHome(dir), color }
  const idx = next.projects.findIndex((p) => resolveProjectPath(p.path) === dir)
  if (idx >= 0) next.projects[idx] = entry
  else next.projects.push(entry)
  saveConfig(next, file)

  const n = scanRepos(dir).length
  const hex = resolveColor(color, getPalette(next)).color
  err(
    `${chalk.green('✔')} Projet "${name}" ${idx >= 0 ? 'modifié' : 'ajouté'} (${chalk.hex(hex)(color)}, ${n} repo${n > 1 ? 's' : ''})`,
  )
  return 0
}

async function cmdRemove(args: string[]): Promise<number> {
  const config = loadOrExit()
  if (!config) return 1
  if (config.projects.length === 0) {
    err('Aucun projet à retirer.')
    return 1
  }
  const palette = getPalette(config)
  let index: number
  const wanted = args.find((a) => !a.startsWith('-'))
  if (wanted) {
    index = config.projects.findIndex((p) => p.name.toLowerCase() === wanted.toLowerCase())
    if (index < 0) {
      err(`ntp config remove : projet « ${wanted} » introuvable.\nProjets : ${config.projects.map((p) => p.name).join(', ')}`)
      return 1
    }
  } else {
    let picked: number | null = null
    await runInk(
      <ProjectSelect
        projects={config.projects.map((p) => ({ ...p, color: resolveColor(p.color, palette).color }))}
        onSubmit={(i) => (picked = i)}
        onCancel={() => undefined}
      />,
    )
    if (picked === null) return 1
    index = picked
  }
  const project = config.projects[index]!
  let yes = false
  await runInk(<Confirm standalone question={`Retirer le projet « ${project.name} » (${project.path}) ?`} onAnswer={(y) => (yes = y)} onCancel={() => undefined} />)
  if (!yes) {
    err('Annulé, rien n\'a été écrit.')
    return 1
  }
  config.projects.splice(index, 1)
  saveConfig(config)
  err(`${chalk.green('✔')} Projet "${project.name}" retiré`)
  return 0
}

function cmdProject(args: string[]): number {
  const [name, action, target] = args
  if (!name || action !== 'add') {
    err(`Usage : ntp config project <nom> add [<chemin>]\n\n${HELP}`)
    return 1
  }
  const config = loadOrExit()
  if (!config) return 1
  const repo = path.resolve(expandTilde(target ?? process.cwd()))
  if (!isGitRepo(repo)) {
    err(`ntp config project : ${repo} n'est pas un repo git (pas de .git).`)
    return 1
  }
  const { status, config: next } = addRepoToProject(config, name, repo)
  if (status === 'no-project') {
    err(`ntp config project : projet « ${name} » introuvable.\nProjets : ${config.projects.map((p) => p.name).join(', ') || '(aucun)'}`)
    return 1
  }
  const label = path.basename(repo)
  if (status === 'already') {
    err(`Repo "${label}" déjà inclus dans le projet "${name}", rien à faire.`)
    return 0
  }
  saveConfig(next)
  const project = next.projects.find((p) => p.name.toLowerCase() === name.toLowerCase())!
  err(`${chalk.green('✔')} Repo "${label}" ajouté au projet "${project.name}"`)
  return 0
}

function cmdEdit(): number {
  const file = configPath()
  if (!fs.existsSync(file)) saveConfig({ colors: DEFAULT_PALETTE, projects: [] }, file)
  const editor = process.env.EDITOR?.trim()
  // stdout du processus est capturé par le shell : l'éditeur écrit sur stderr.
  const stdio: ['inherit', number, number] = ['inherit', 2, 2]
  const r = editor
    ? spawnSync(`${editor} "${file}"`, { stdio, shell: true })
    : spawnSync('open', ['-t', file], { stdio })
  return r.status ?? 1
}
