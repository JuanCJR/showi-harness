#!/usr/bin/env bash
# T-006 · Un repositorio desechable instala el método desde el remoto y lo reparte a los seis
# destinos. AC-1, AC-2 y AC-15.
#
#   bash test/instalacion.sh [ref]     ref por defecto: la rama por defecto del remoto
#
# **No se simula con una copia local.** Copiar carpetas probaría que `cp` funciona; lo que hay que
# probar es que `rulesync install` resuelve el origen, lo fija por SHA en el lockfile y que el
# fan-out deja el mismo método en todas partes. Por eso esta prueba necesita red, y por eso vive
# fuera de `npm test`: es lenta y depende de un tercero.

set -uo pipefail

REPO="JuanCJR/showi-harness"
REF="${1:-}"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORIGEN="$REPO${REF:+@$REF}"

D="$(mktemp -d)"
trap 'rm -rf "$D"' EXIT
cd "$D" || exit 2
git init -q

cat > rulesync.jsonc <<EOF
{
  "targets": ["claudecode","cursor","copilot","opencode","kiro-ide","agentsmd","agentsskills"],
  "features": ["skills","rules"],
  "sources": [
    { "source": "$ORIGEN",
      "skills": ["spec-driven-development","test-driven-development-tdd","stop-and-report","verification-and-measurement"],
      "rules": ["metodo"] }
  ]
}
EOF

echo "== install desde $ORIGEN"
npx -y rulesync@latest install >/dev/null 2>&1 || { echo "  ✗ install falló"; exit 1; }

# El lockfile es lo que hace reproducible la instalación: sin SHA resuelto, dos clones del mismo
# commit podrían acabar con métodos distintos.
sha=$(python3 -c "import json;print(json.load(open('rulesync.lock'))['sources']['${REPO,,}']['resolvedRef'])" 2>/dev/null)
if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "  ✗ el lockfile no fijó un SHA (salió: '${sha:-nada}')"
  exit 1
fi
echo "  ✓ fijado en $sha"

echo "== generate a los siete destinos"
npx -y rulesync@latest generate >/dev/null 2>&1 || { echo "  ✗ generate falló"; exit 1; }

echo "== integridad del árbol generado"
bash "$AQUI/test/integridad.sh" "$D" || exit 1

# AC-15: el árbol de partida era un `git init` vacío. Si algo dependiera del proyecto de referencia,
# habría fallado antes de llegar aquí.
echo
echo "Instalación en un repositorio vacío: correcta."
