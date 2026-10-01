import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.tsx'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  minify: true,
  splitting: false,
  // Un seul fichier : on embarque toutes les dépendances.
  noExternal: [/.*/],
  banner: {
    js: '#!/usr/bin/env node\nimport { createRequire as __cr } from "node:module";const require = __cr(import.meta.url);',
  },
  esbuildOptions(o) {
    o.alias = { 'react-devtools-core': './src/empty.ts' }
  },
})
