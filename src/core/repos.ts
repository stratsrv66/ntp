import fs from 'node:fs'
import path from 'node:path'

export function isGitRepo(dir: string): boolean {
  // `.git` est un dossier, ou un fichier pour les worktrees/submodules.
  return fs.existsSync(path.join(dir, '.git'))
}

/** Sous-dossiers directs contenant un `.git`, hors cachés, triés alphabétiquement. */
export function scanRepos(dir: string): string[] {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries
    .filter((e) => !e.name.startsWith('.'))
    .filter((e) => {
      if (e.isDirectory()) return true
      // lien symbolique vers un dossier
      if (e.isSymbolicLink()) {
        try { return fs.statSync(path.join(dir, e.name)).isDirectory() } catch { return false }
      }
      return false
    })
    .filter((e) => isGitRepo(path.join(dir, e.name)))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b))
}
