// Point d'entrée. Aucun import statique d'Ink/chalk ici : FORCE_COLOR doit être
// positionné avant leur chargement (stdout est capturé par $(...) dans la fonction zsh).
if (process.stderr.isTTY && process.env.FORCE_COLOR === undefined) {
  process.env.FORCE_COLOR = '3'
}

const HELP = `ntp-cli : navigue rapidement vers tes repos

  ntp                    ouvre l'interface
  ntp <requête>          va directement au repo s'il n'y a qu'une correspondance
  ntp config <commande>  gère la configuration (ntp config --help)

Le "cd" est fait par la fonction zsh définie dans shell/ntp.zsh.
`

async function main(args: string[]): Promise<number> {
  if (args[0] === 'config') {
    const { runConfig } = await import('./commands/config.js')
    return runConfig(args.slice(1))
  }
  if (args[0] === '--help' || args[0] === '-h') {
    process.stderr.write(HELP)
    return 0
  }
  const { runSearch } = await import('./commands/search.js')
  return runSearch(args)
}

main(process.argv.slice(2)).then(
  (code) => {
    // On laisse stdout se vider avant de quitter.
    process.stdout.write('', () => process.exit(code))
  },
  (e: unknown) => {
    process.stderr.write(`ntp : erreur inattendue : ${e instanceof Error ? e.message : String(e)}\n`)
    process.exit(2)
  },
)
