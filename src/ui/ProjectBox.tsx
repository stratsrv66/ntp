import React from 'react'
import { Box, Text } from 'ink'
import type { ProjectView } from '../core/items.js'

interface Props {
  project: ProjectView
  repos: ProjectView['repos']
  /** Titre (le projet lui-même) sélectionné. */
  titleSelected: boolean
  /** Chemin du repo sélectionné, le cas échéant. */
  selectedPath?: string
  empty: boolean
}

export function ProjectBox({ project, repos, titleSelected, selectedPath, empty }: Props) {
  const { color } = project
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={1} marginRight={1}>
      <Text bold color={color} inverse={titleSelected}>
        {project.name}
      </Text>
      {project.warnings.map((w) => (
        <Text key={w} color="yellow">
          ⚠ {w}
        </Text>
      ))}
      {repos.map((r) => (
        <Text key={r.path} color={color} inverse={r.path === selectedPath}>
          {r.name}
        </Text>
      ))}
      {empty && repos.length === 0 && project.warnings.length === 0 && (
        <Text dimColor>(aucun repo)</Text>
      )}
    </Box>
  )
}
