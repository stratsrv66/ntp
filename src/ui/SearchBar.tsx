import React from 'react'
import { Box, Text } from 'ink'

export function SearchBar({ query, ghost }: { query: string; ghost: string }) {
  const cursor = ghost[0] ?? ' '
  return (
    <Box>
      <Text bold>› </Text>
      <Text>{query}</Text>
      <Text inverse color={ghost ? 'gray' : undefined}>
        {cursor}
      </Text>
      <Text color="gray">{ghost.slice(1)}</Text>
    </Box>
  )
}

export function HelpLine() {
  return <Text dimColor>↑↓ naviguer · Tab compléter · Entrée aller · Échap quitter</Text>
}
