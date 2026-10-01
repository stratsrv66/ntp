import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function tmpDir(): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ntp-test-')))
}

export function mkRepo(parent: string, name: string, asFile = false): string {
  const dir = path.join(parent, name)
  fs.mkdirSync(dir, { recursive: true })
  if (asFile) fs.writeFileSync(path.join(dir, '.git'), 'gitdir: ../elsewhere')
  else fs.mkdirSync(path.join(dir, '.git'))
  return dir
}

export const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms))
