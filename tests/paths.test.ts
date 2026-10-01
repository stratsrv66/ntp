import { describe, expect, it } from 'vitest'
import { collapseHome, expandTilde } from '../src/core/paths.js'

describe('paths', () => {
  it('expandTilde résout ~ et ~/x', () => {
    expect(expandTilde('~', '/home/u')).toBe('/home/u')
    expect(expandTilde('~/dev/a', '/home/u')).toBe('/home/u/dev/a')
  })
  it('expandTilde laisse les autres chemins intacts', () => {
    expect(expandTilde('/abs/x', '/home/u')).toBe('/abs/x')
    expect(expandTilde('~other/x', '/home/u')).toBe('~other/x')
  })
  it('collapseHome réécrit sous le home uniquement', () => {
    expect(collapseHome('/home/u/dev/a', '/home/u')).toBe('~/dev/a')
    expect(collapseHome('/home/u', '/home/u')).toBe('~')
    expect(collapseHome('/home/user2/a', '/home/u')).toBe('/home/user2/a')
  })
})
