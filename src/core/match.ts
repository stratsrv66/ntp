export type MatchKind = 'exact' | 'prefix' | 'substring' | 'fuzzy'

const RANK: Record<MatchKind, number> = { exact: 0, prefix: 1, substring: 2, fuzzy: 3 }

/** Type de correspondance de `query` dans `text` (insensible à la casse), ou null. */
export function matchKind(query: string, text: string): MatchKind | null {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t === q) return 'exact'
  if (t.startsWith(q)) return 'prefix'
  if (t.includes(q)) return 'substring'
  let i = 0
  for (const ch of t) if (ch === q[i] && ++i === q.length) return 'fuzzy'
  return null
}

export interface Searchable {
  label: string
}

export interface Ranked<T> {
  item: T
  kind: MatchKind
}

/**
 * Filtre et classe : exact > préfixe > sous-chaîne > sous-séquence.
 * À égalité : ordre alphabétique. Requête vide → tout, dans l'ordre d'origine
 * (celui de l'affichage), pour que ↑↓ suivent l'ordre visuel.
 */
export function rank<T extends Searchable>(query: string, items: readonly T[]): Ranked<T>[] {
  if (query === '') return items.map((item) => ({ item, kind: 'prefix' as const }))
  const out: Ranked<T>[] = []
  for (const item of items) {
    const kind = matchKind(query, item.label)
    if (kind) out.push({ item, kind })
  }
  return out.sort(
    (a, b) =>
      RANK[a.kind] - RANK[b.kind] ||
      a.item.label.localeCompare(b.item.label, undefined, { sensitivity: 'base' }),
  )
}
