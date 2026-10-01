/** Plus long préfixe commun (insensible à la casse), avec la casse du premier libellé. */
export function commonPrefix(labels: readonly string[]): string {
  if (labels.length === 0) return ''
  const first = labels[0]!
  let n = first.length
  for (const l of labels) {
    let i = 0
    while (i < n && i < l.length && l[i]!.toLowerCase() === first[i]!.toLowerCase()) i++
    n = i
  }
  return first.slice(0, n)
}

export interface TabResult {
  query: string
  selected: number
}

/**
 * Tab : complète jusqu'au plus long préfixe commun des correspondances ;
 * si la saisie l'atteint déjà, passe à la correspondance suivante (précédente avec `back`).
 */
export function applyTab(
  query: string,
  labels: readonly string[],
  selected: number,
  back = false,
): TabResult {
  if (labels.length === 0) return { query, selected }
  const prefix = commonPrefix(labels)
  const extends_ =
    !back &&
    prefix.length > query.length &&
    prefix.toLowerCase().startsWith(query.toLowerCase())
  if (extends_) return { query: prefix, selected }
  const step = back ? -1 : 1
  return { query, selected: (selected + step + labels.length) % labels.length }
}

/** Ghost text : reste du libellé sélectionné après la saisie, si c'est un préfixe. */
export function ghostText(query: string, label: string | undefined): string {
  if (!label || query === '') return ''
  return label.toLowerCase().startsWith(query.toLowerCase()) ? label.slice(query.length) : ''
}
