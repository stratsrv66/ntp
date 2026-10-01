import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  addRepoToProject,
  ConfigError,
  getPalette,
  loadConfig,
  missingConfigMessage,
  parseConfig,
  saveConfig,
} from '../src/core/config.js'
import { DEFAULT_PALETTE, resolveColor } from '../src/core/colors.js'
import { tmpDir } from './helpers.js'

describe('config', () => {
  it('accepte une config valide sans palette → palette par défaut', () => {
    const c = parseConfig('{"projects":[{"name":"P","path":"~/p","color":"vert"}]}')
    expect(c.projects).toHaveLength(1)
    expect(getPalette(c)).toBe(DEFAULT_PALETTE)
  })
  it('utilise la palette fournie', () => {
    const c = parseConfig('{"colors":{"x":"#111111"},"projects":[]}')
    expect(getPalette(c)).toEqual({ x: '#111111' })
  })
  it.each([
    ['pas du JSON', '{nope'],
    ['racine tableau', '[]'],
    ['projects absent', '{}'],
    ['name manquant', '{"projects":[{"path":"a","color":"b"}]}'],
    ['colors invalide', '{"colors":[],"projects":[]}'],
  ])('rejette : %s', (_n, text) => {
    expect(() => parseConfig(text)).toThrow(ConfigError)
  })
  it('loadConfig : fichier absent → ConfigError claire', () => {
    expect(() => loadConfig(path.join(tmpDir(), 'nope.json'))).toThrow(/introuvable/)
  })
  it('message d’erreur : chemin, ntp config add et exemple', () => {
    const m = missingConfigMessage('x', '/f/config.json')
    expect(m).toContain('/f/config.json')
    expect(m).toContain('ntp config add')
    expect(m).toContain('"projects"')
  })
  it('saveConfig : atomique, indentation 2, relisible, sans fichier temporaire', () => {
    const dir = tmpDir()
    const file = path.join(dir, 'sub', 'config.json')
    saveConfig({ projects: [{ name: 'P', path: '~/p', color: 'vert' }] }, file)
    const text = fs.readFileSync(file, 'utf8')
    expect(text).toContain('\n  "projects": [\n    {\n      "name"')
    expect(loadConfig(file).projects[0]!.name).toBe('P')
    expect(fs.readdirSync(path.dirname(file))).toEqual(['config.json'])
  })
})

describe('couleurs', () => {
  it('nom de palette, hex direct, nom Ink', () => {
    expect(resolveColor('vert', DEFAULT_PALETTE).color).toBe('#22c55e')
    expect(resolveColor('#60a5fa', DEFAULT_PALETTE)).toEqual({ color: '#60a5fa' })
    expect(resolveColor('magenta', DEFAULT_PALETTE).color).toBe('magenta')
  })
  it('inconnu → gris + avertissement', () => {
    const r = resolveColor('mauve', DEFAULT_PALETTE)
    expect(r.color).toBe('#9ca3af')
    expect(r.warning).toMatch(/mauve/)
  })
})

describe('repos explicites', () => {
  const base = { projects: [{ name: 'Payment', path: '~/dev/payment', color: 'vert' }] }
  it('valide repos, rejette un tableau invalide', () => {
    const ok = parseConfig('{"projects":[{"name":"P","path":"a","color":"b","repos":["~/x"]}]}')
    expect(ok.projects[0]!.repos).toEqual(['~/x'])
    expect(() => parseConfig('{"projects":[{"name":"P","path":"a","color":"b","repos":[1]}]}')).toThrow(ConfigError)
  })
  it('ajoute (nom insensible à la casse, chemin avec ~), sans muter l’original', () => {
    const r = addRepoToProject(base, 'payment', '/h/work/legacy', '/h')
    expect(r.status).toBe('added')
    expect(r.config.projects[0]!.repos).toEqual(['~/work/legacy'])
    expect(base.projects[0]).not.toHaveProperty('repos')
  })
  it('doublon explicite ou sous-dossier direct → already', () => {
    const once = addRepoToProject(base, 'Payment', '/h/work/legacy', '/h').config
    expect(addRepoToProject(once, 'Payment', '/h/work/legacy', '/h').status).toBe('already')
    expect(addRepoToProject(base, 'Payment', '/h/dev/payment/api', '/h').status).toBe('already')
  })
  it('projet inconnu', () => {
    expect(addRepoToProject(base, 'Nope', '/x', '/h').status).toBe('no-project')
  })
})
