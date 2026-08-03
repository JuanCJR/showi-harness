#!/usr/bin/env bash
# Deja `showi` disponible en cualquier terminal.
#
#   curl -fsSL https://raw.githubusercontent.com/JuanCJR/showi-harness/main/install.sh | bash
#
# o, si ya tienes el repositorio clonado:
#
#   bash install.sh
#
# **No usa `npm link` a propósito.** Ése instala en el `bin` de la versión de node en uso, así que
# un `nvm use` hace desaparecer el comando sin explicación, y parece que se desinstaló. Esto crea un
# lanzador que no depende de la versión de node.

set -euo pipefail

REPO="https://github.com/JuanCJR/showi-harness.git"
DESTINO="${SHOWI_HOME:-$HOME/.showi}"

rojo()  { printf '\033[31m%s\033[0m\n' "$1"; }
verde() { printf '\033[32m%s\033[0m\n' "$1"; }

# ── 1 · node ─────────────────────────────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  rojo "Hace falta node (22 o superior). Instálalo y vuelve a intentarlo."
  exit 1
fi
MAYOR=$(node -p 'process.versions.node.split(".")[0]')
if [[ "$MAYOR" -lt 22 ]]; then
  rojo "node $(node --version) es demasiado antiguo; hace falta 22 o superior."
  exit 1
fi

# ── 2 · el repositorio ───────────────────────────────────────────────────────────────────────
# Si se ejecuta desde un clon, se usa ése: así quien esté desarrollando el método no acaba con dos
# copias y preguntándose cuál manda.
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]:-}")" 2>/dev/null && pwd || true)"
if [[ -n "$AQUI" && -f "$AQUI/src/cli.mjs" ]]; then
  DESTINO="$AQUI"
  echo "Usando el clon que ya tienes: $DESTINO"
elif [[ -d "$DESTINO/.git" ]]; then
  echo "Actualizando $DESTINO"
  git -C "$DESTINO" pull --ff-only --quiet
else
  echo "Clonando en $DESTINO"
  git clone --quiet "$REPO" "$DESTINO"
fi

(cd "$DESTINO" && npm install --omit=dev --silent)

# ── 3 · el lanzador, en un sitio que no dependa de node ──────────────────────────────────────
BIN=""
for candidato in "$HOME/.local/bin" "$HOME/bin"; do
  case ":$PATH:" in *":$candidato:"*) BIN="$candidato"; break ;; esac
done
if [[ -z "$BIN" ]]; then
  BIN="$HOME/.local/bin"
  mkdir -p "$BIN"
fi

cat > "$BIN/showi" <<LANZADOR
#!/usr/bin/env bash
# Generado por install.sh de showi. Apunta al repositorio, no a una copia: lo que cambie ahí está
# disponible al instante.
exec node "$DESTINO/src/cli.mjs" "\$@"
LANZADOR
chmod +x "$BIN/showi"

# ── 4 · comprobar que de verdad responde, no suponerlo ───────────────────────────────────────
echo
# `showi` sin argumentos imprime el uso y **sale con 2**, así que no sirve de prueba de vida.
# `showi roles` lee el catálogo del disco y sale 0: comprueba que el lanzador llega al repositorio
# y que el repositorio está entero.
if command -v showi >/dev/null 2>&1 && showi roles >/dev/null 2>&1; then
  verde "showi instalado en $BIN/showi"
else
  case ":$PATH:" in
    *":$BIN:"*) rojo "showi está en $BIN pero no responde. Revisa: node $DESTINO/src/cli.mjs"; exit 1 ;;
    *)
      verde "showi instalado en $BIN/showi"
      echo
      rojo "Pero $BIN no está en tu PATH. Añade esta línea a tu ~/.bashrc o ~/.zshrc:"
      echo
      echo "    export PATH=\"$BIN:\$PATH\""
      echo
      echo "y abre una terminal nueva."
      ;;
  esac
fi

echo
echo "Empieza por aquí:"
echo "  showi roles                                          ver los roles disponibles"
echo "  cd tu-proyecto && showi init . \"Nombre\" slug --roles orchestrator,backend"
