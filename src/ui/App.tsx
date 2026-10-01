import React, { useMemo, useState } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import type { Item, ProjectView } from '../core/items.js'
import { buildItems, withProjectRepos } from '../core/items.js'
import { rank } from '../core/match.js'
import { applyTab, ghostText } from '../core/complete.js'
import { ProjectBox } from './ProjectBox.js'
import { HelpLine, SearchBar } from './SearchBar.js'

interface Props {
  projects: ProjectView[]
  initialQuery?: string
  /** Appelé avec le chemin choisi juste avant la fermeture. */
  onSelect: (path: string) => void
}

export function App({ projects, initialQuery = '', onSelect }: Props) {
  const { exit } = useApp()
  const items = useMemo(() => buildItems(projects), [projects])
  const [query, setQuery] = useState(initialQuery)
  const [selected, setSelected] = useState(0)

  const matches = useMemo(() => rank(query, items).map((r) => r.item), [query, items])
  const results = useMemo(() => withProjectRepos(matches, items), [matches, items])
  const current: Item | undefined = results[Math.min(selected, results.length - 1)]
  const ghost = ghostText(query, current?.label)

  const update = (q: string) => {
    setQuery(q)
    setSelected(0)
  }

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      exit()
    } else if (key.return) {
      if (current) {
        onSelect(current.path)
        exit()
      }
    } else if (key.tab) {
      const r = applyTab(query, matches.map((x) => x.label), selected, key.shift)
      setQuery(r.query)
      setSelected(r.selected)
    } else if (key.upArrow) {
      if (results.length) setSelected((s) => (s - 1 + results.length) % results.length)
    } else if (key.downArrow) {
      if (results.length) setSelected((s) => (s + 1) % results.length)
    } else if (key.backspace || key.delete) {
      update(query.slice(0, -1))
    } else if (input && !key.ctrl && !key.meta) {
      update(query + input)
    }
  })

  const matchedIds = new Set(results.map((r) => r.id))
  const visible = projects
    .map((p) => {
      const repos = p.repos.filter((r) => matchedIds.has(`r:${r.path}`))
      const titleMatched = matchedIds.has(`p:${p.path}`)
      return { p, repos, titleMatched }
    })
    .filter((v) => query === '' || v.titleMatched || v.repos.length > 0)

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" flexWrap="wrap">
        {visible.map(({ p, repos }) => (
          <ProjectBox
            key={p.path}
            project={p}
            repos={repos}
            titleSelected={current?.id === `p:${p.path}`}
            selectedPath={current?.kind === 'repo' ? current.path : undefined}
            empty={query === ''}
          />
        ))}
      </Box>
      {results.length === 0 && <Text color="red">Aucun repo trouvé</Text>}
      <SearchBar query={query} ghost={ghost} />
      <HelpLine />
    </Box>
  )
}
