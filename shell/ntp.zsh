# ntp : navigue vers un projet/repo. Voir README.md.
# `ntp-cli` affiche son interface sur stderr et n'écrit sur stdout que le chemin choisi.
ntp() {
  local dir
  dir="$(command ntp-cli "$@")" || return
  [ -n "$dir" ] && cd "$dir"
}
