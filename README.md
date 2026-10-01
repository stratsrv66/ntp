# ntp : navigueToProject

Navigue vers tes repos depuis le terminal (macOS, zsh) avec une interface TUI (React + Ink).

```
$ ntp            # interface : un rectangle coloré par projet, recherche en direct
$ ntp gateway    # une seule correspondance : cd immédiat, sans interface
```

## Installation

Prérequis : Node 20+.

```sh
npm install
npm run build && npm link     # installe le binaire `ntp-cli`
```

Ajoute ensuite la fonction zsh dans `~/.zshrc` (le contenu est dans `shell/ntp.zsh`) :

```zsh
ntp() {
  local dir
  dir="$(command ntp-cli "$@")" || return
  [ -n "$dir" ] && cd "$dir"
}
```

ou, plus simplement : `source /chemin/vers/ntp/shell/ntp.zsh`. Puis `source ~/.zshrc`.

Premier projet : place-toi dans le dossier qui contient tes repos et lance `ntp config add`.

## Pourquoi une fonction zsh ? (stdout / stderr)

Un processus enfant ne peut pas changer le répertoire du shell qui l'a lancé. `ntp-cli` :

- dessine **toute l'interface sur stderr** ;
- écrit **uniquement le chemin choisi sur stdout**, sans retour à la ligne, après la fermeture complète de l'interface, puis sort avec le code 0 ;
- si tu annules (Échap / Ctrl+C), n'écrit rien et sort avec le code 1.

La fonction capture stdout avec `$(...)` et fait le `cd`. Comme stdout est capturé, `ntp-cli` force les couleurs sur stderr (`FORCE_COLOR=3`) quand stderr est un terminal.

Les sous-commandes `ntp config ...` n'écrivent jamais sur stdout : aucun `cd` n'est donc effectué.

## Configuration

Fichier `~/.config/ntp/config.json` (créé par le premier `ntp config add`) :

```json
{
  "colors": {
    "rouge": "#ef4444", "rose": "#ec4899", "orange": "#f97316",
    "jaune": "#eab308", "vert": "#22c55e", "cyan": "#06b6d4",
    "bleu": "#3b82f6", "violet": "#8b5cf6", "gris": "#9ca3af"
  },
  "projects": [
    { "name": "Payment", "path": "~/dev/payment", "color": "vert" },
    { "name": "Sportsbook", "path": "~/dev/sportsbook", "color": "#60a5fa" }
  ]
}
```

- `colors` (optionnel) : palette nommée. Absente, la palette ci-dessus est utilisée. Modifie les hex ou ajoute tes couleurs.
- `color` d'un projet : nom de la palette, hex direct, ou nom de couleur Ink (`magenta`, ...). Nom inconnu : rectangle gris + avertissement.
- `path` : `~` est résolu vers le home ; `ntp config add` l'enregistre avec `~` quand c'est possible.
- Les repos sont **scannés à chaque lancement** (rien n'est stocké) : sous-dossiers directs contenant un `.git` (dossier ou fichier, pour les worktrees), hors dossiers cachés, triés alphabétiquement.
- `repos` (optionnel, par projet) : repos ajoutés à la main par `ntp config project <nom> add`, en plus de ceux détectés (ex. `"repos": ["~/work/legacy-gateway"]`).
- Si le `path` d'un projet n'existe pas, son rectangle affiche un avertissement.
- Les écritures sont atomiques (fichier temporaire puis renommage), indentation de 2 espaces.

## Sous-commandes `config`

`config` est un mot réservé (jamais une recherche).

| Commande | Effet |
| --- | --- |
| `ntp config add [--name <nom>] [--color <couleur>]` (alias `--add`) | Ajoute le dossier courant : aperçu des repos, nom, sélecteur de couleur avec aperçu. Dossier déjà configuré : modification. Aucun repo : confirmation. Dossier qui est lui-même un repo : propose le parent. Échap annule. |
| `ntp config list` | Projets, couleur, chemin, nombre de repos |
| `ntp config project <nom> add [<chemin>]` | Ajoute un repo (dossier courant par défaut) au projet, utile pour un repo situé hors du dossier du projet. Déjà inclus : rien n'est écrit. Doit contenir un `.git`. |
| `ntp config remove [<nom>]` | Retire un projet (avec confirmation) |
| `ntp config edit` | Ouvre la config dans `$EDITOR` (sinon `open -t`) |
| `ntp config path` | Affiche le chemin du fichier de config |
| `ntp config --help` | Aide |

## Recherche et clavier

Les repos **et** les projets sont cherchables (un projet mène à son dossier). Insensible à la casse ; classement : exacte > préfixe > sous-chaîne > sous-séquence floue (`pgw` trouve `payment-gateway`), puis ordre alphabétique. Quand un projet correspond, tous ses repos sont aussi affichés (après les correspondances directes) et sélectionnables avec `↑`/`↓`.

| Touche | Action |
| --- | --- |
| lettres / `Backspace` | Modifie la recherche (la sélection revient sur le meilleur résultat) |
| `Tab` | Complète jusqu'au plus long préfixe commun ; si déjà atteint, passe à la correspondance suivante |
| `Shift+Tab` | Correspondance précédente |
| `↑` / `↓` | Déplace la sélection |
| `Entrée` | Va dans le dossier sélectionné |
| `Échap` / `Ctrl+C` | Quitte sans changer de dossier |

**Mode direct** : `ntp <requête>` écrit directement le chemin s'il y a une seule correspondance (ou une seule correspondance exacte). Sinon l'interface s'ouvre avec la requête déjà saisie.

## Développement

```sh
npm run dev -- <args>   # exécute src/cli.tsx via tsx
npm test                # vitest + ink-testing-library
npm run build           # bundle unique dist/cli.js (tsup)
```

Architecture : `src/core/` (logique pure : config, repos, matching, complétion), `src/ui/` (composants Ink), `src/commands/` (recherche et `config`). Les éléments recherchables passent par le type `Item` (`src/core/items.ts`), point d'extension prévu pour frecency, statut git, ouverture IDE/GitLab.
