import { describe, expect, it } from 'vitest'
import { matchKind, rank } from '../src/core/match.js'
import { applyTab, commonPrefix, ghostText } from '../src/core/complete.js'
import { directTarget } from '../src/commands/search.js'

const L = (...labels: string[]) => labels.map((label) => ({ label }))

describe('matchKind', () => {
  it('exact, préfixe, sous-chaîne, sous-séquence, aucun', () => {
    expect(matchKind('api', 'API')).toBe('exact')
    expect(matchKind('pay', 'payment-gateway')).toBe('prefix')
    expect(matchKind('gate', 'payment-gateway')).toBe('substring')
    expect(matchKind('pgw', 'payment-gateway')).toBe('fuzzy')
    expect(matchKind('xyz', 'payment-gateway')).toBeNull()
  })
})

describe('rank', () => {
  it('classe exact > préfixe > sous-chaîne > flou, alphabétique à égalité', () => {
    const r = rank('pay', L('zpay-x', 'payment', 'pay', 'p-a-y', 'payer', 'apay'))
    expect(r.map((x) => x.item.label)).toEqual(['pay', 'payer', 'payment', 'apay', 'zpay-x', 'p-a-y'])
    expect(r.map((x) => x.kind)).toEqual(['exact', 'prefix', 'prefix', 'substring', 'substring', 'fuzzy'])
  })
  it('pgw trouve payment-gateway', () => {
    expect(rank('pgw', L('payment-gateway', 'other')).map((x) => x.item.label)).toEqual(['payment-gateway'])
  })
  it('requête vide : tout, ordre d’origine', () => {
    expect(rank('', L('b', 'a')).map((x) => x.item.label)).toEqual(['b', 'a'])
  })
})

describe('complétion Tab', () => {
  it('plus long préfixe commun, insensible à la casse', () => {
    expect(commonPrefix(['payment-api', 'Payment-gateway'])).toBe('payment-')
    expect(commonPrefix([])).toBe('')
  })
  it('complète jusqu’au préfixe commun', () => {
    expect(applyTab('pa', ['payment-api', 'payment-gateway'], 0)).toEqual({ query: 'payment-', selected: 0 })
  })
  it('déjà au préfixe : passe à la suivante, Shift+Tab à la précédente (cyclique)', () => {
    const labels = ['payment-api', 'payment-gateway']
    expect(applyTab('payment-', labels, 0)).toEqual({ query: 'payment-', selected: 1 })
    expect(applyTab('payment-', labels, 1)).toEqual({ query: 'payment-', selected: 0 })
    expect(applyTab('payment-', labels, 0, true)).toEqual({ query: 'payment-', selected: 1 })
  })
  it('correspondance unique : complète en entier', () => {
    expect(applyTab('gat', ['gateway'], 0)).toEqual({ query: 'gateway', selected: 0 })
  })
  it('aucun résultat : inchangé', () => {
    expect(applyTab('zz', [], 0)).toEqual({ query: 'zz', selected: 0 })
  })
  it('ghost text', () => {
    expect(ghostText('pay', 'payment')).toBe('ment')
    expect(ghostText('pgw', 'payment-gateway')).toBe('')
    expect(ghostText('', 'x')).toBe('')
  })
})

describe('mode direct', () => {
  it('une seule correspondance → cible', () => {
    expect(directTarget('gateway', L('payment-gateway', 'api'))?.label).toBe('payment-gateway')
  })
  it('plusieurs mais une seule exacte → cible', () => {
    expect(directTarget('api', L('api', 'api-gateway'))?.label).toBe('api')
  })
  it('ambigu ou aucun → undefined (ouvre l’interface)', () => {
    expect(directTarget('pay', L('payment', 'payer'))).toBeUndefined()
    expect(directTarget('zzz', L('payment'))).toBeUndefined()
  })
})
