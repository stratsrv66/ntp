import type { ReactElement } from 'react'

/** Rend un élément Ink sur stderr (stdout reste réservé au chemin choisi). */
export async function runInk(element: ReactElement): Promise<void> {
  const { render } = await import('ink')
  const instance = render(element, { stdout: process.stderr, exitOnCtrlC: false })
  await instance.waitUntilExit()
}

export const err = (s: string) => process.stderr.write(s.endsWith('\n') ? s : s + '\n')
