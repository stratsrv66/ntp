import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildItems, buildProjects } from '../src/core/items.js'
import { scanRepos } from '../src/core/repos.js'
import { mkRepo, tmpDir } from './helpers.js'

describe('scanRepos', () => {
  it('détecte .git dossier et fichier, ignore cachés/non-repos/fichiers, trie', () => {
    const d = tmpDir()
    mkRepo(d, 'zeta')
    mkRepo(d, 'alpha')
    mkRepo(d, 'worktree', true)
    mkRepo(d, '.hidden')
    fs.mkdirSync(path.join(d, 'plain'))
    fs.writeFileSync(path.join(d, 'file.txt'), '')
    expect(scanRepos(d)).toEqual(['alpha', 'worktree', 'zeta'])
  })
  it('dossier inexistant → []', () => {
    expect(scanRepos(path.join(tmpDir(), 'nope'))).toEqual([])
  })
})

describe('buildProjects', () => {
  it('résout ~, couleurs, avertissements pour path manquant et couleur inconnue', () => {
    const home = tmpDir()
    mkRepo(path.join(home, 'dev', 'pay'), 'gateway')
    const views = buildProjects(
      {
        projects: [
          { name: 'Pay', path: '~/dev/pay', color: 'vert' },
          { name: 'Gone', path: '~/dev/gone', color: 'mauve' },
        ],
      },
      home,
    )
    expect(views[0]!.repos.map((r) => r.name)).toEqual(['gateway'])
    expect(views[0]!.color).toBe('#22c55e')
    expect(views[1]!.warnings.join(' ')).toMatch(/introuvable/)
    expect(views[1]!.warnings.join(' ')).toMatch(/mauve/)
    expect(views[1]!.color).toBe('#9ca3af')
    expect(buildItems(views).map((i) => i.label)).toEqual(['Pay', 'gateway'])
  })
})

describe('buildProjects : repos explicites', () => {
  it('fusionne, dédoublonne, trie, et avertit si absent', () => {
    const home = tmpDir()
    mkRepo(path.join(home, 'dev', 'pay'), 'b-api')
    const outside = mkRepo(path.join(home, 'work'), 'a-legacy')
    const [v] = buildProjects(
      {
        projects: [
          {
            name: 'Pay', path: '~/dev/pay', color: 'vert',
            repos: ['~/work/a-legacy', outside, '~/dev/pay/b-api', '~/work/gone'],
          },
        ],
      },
      home,
    )
    expect(v!.repos.map((r) => r.name)).toEqual(['a-legacy', 'b-api'])
    expect(v!.warnings.join(' ')).toMatch(/repo introuvable : ~\/work\/gone/)
  })
})
