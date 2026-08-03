#!/usr/bin/env bash
# Integridad del método — AC-1, AC-2, AC-3 y AC-4 de specs/000-extraccion.
#
#   bash test/integridad.sh              comprueba ESTE repositorio (la fuente)
#   bash test/integridad.sh /ruta/proy   comprueba un proyecto consumidor (los seis destinos)
#
# Existe por un defecto real: durante siete specs, cuatro herramientas cargaron dos skills de
# terceros en lugar de las propias, y las otras dos no existían para ellas. El script anterior no lo
# vio porque solo miraba la ruta de UNA herramienta y porque **trataba la ausencia como silencio**.
# Las dos cosas se corrigen aquí, y son las que le dan valor: mirar los seis destinos, y que faltar
# sea un fallo.

set -uo pipefail

# ── Las enumeraciones. Ningún recuento de este script está escrito a mano. ────────────────────
METODO=(spec-driven-development test-driven-development-tdd stop-and-report verification-and-measurement)
RUTAS_SKILL=(.claude/skills .cursor/skills .github/skills .opencode/skills .kiro/skills .agents/skills)

# Palabras que el método no debe pronunciar. Nombrar un stack concreto significa que al portarlo
# mentirá. Se usan fronteras de palabra para no cazar prosa que solo las contiene.
FUGA='\b(vitest|jest|pytest|mocha|playwright|cypress|nestjs|express|fastapi|django|rails|spring|react|vue|svelte|angular|next\.js|prisma|sequelize|mongoose|typeorm|zustand|redux|tailwind|postgres|postgresql|mysql|mongodb|redis|pnpm|yarn|poetry|cargo|gradle|maven|tsc|eslint)\b|IMPLEMENTATION\.md'

PROYECTO="${1:-}"
faltan=0
fugas=0
divergen=0

rojo()  { printf '  \033[31m✗\033[0m %s\n' "$1"; }
verde() { printf '  \033[32m✓\033[0m %s\n' "$1"; }

# El cuerpo, sin el frontmatter: `metadata.origin` es procedencia, no contenido.
cuerpo() { awk 'NR>1 && /^---$/{p=1;next} p' "$1"; }

comprobar_fuga() {
  local f="$1" hallazgo
  hallazgo=$(cuerpo "$f" | grep -nEi "$FUGA")
  if [[ -n "$hallazgo" ]]; then
    rojo "FUGA · $f nombra un stack concreto:"
    printf '      %s\n' "$hallazgo"
    fugas=$((fugas + 1))
  fi
}

if [[ -z "$PROYECTO" ]]; then
  # ── Modo fuente: el layout que exige `sources` de rulesync ──────────────────────────────────
  echo "Integridad de la fuente ($(pwd))"

  for skill in "${METODO[@]}"; do
    f="skills/$skill/SKILL.md"
    if [[ ! -f "$f" ]]; then
      rojo "FALTA · $f — «sources» solo descubre skills en <path>/<nombre>/SKILL.md"
      faltan=$((faltan + 1))
      continue
    fi
    # El estándar de skills exige que el nombre declarado sea el del directorio.
    declarado=$(grep -m1 '^name:' "$f" | sed 's/^name:[[:space:]]*//')
    if [[ "$declarado" != "$skill" ]]; then
      rojo "NOMBRE · $f declara «$declarado» y vive en «$skill»"
      faltan=$((faltan + 1))
      continue
    fi
    comprobar_fuga "$f"
    verde "$skill"
  done

  if [[ ! -f rules/metodo.md ]]; then
    rojo "FALTA · rules/metodo.md — es la raíz del método, la que acaba en AGENTS.md"
    faltan=$((faltan + 1))
  else
    comprobar_fuga rules/metodo.md
    verde "rules/metodo.md"
  fi
else
  # ── Modo consumidor: los seis destinos, y las copias tienen que ser la misma ────────────────
  echo "Integridad del consumidor ($PROYECTO)"
  cd "$PROYECTO" || { echo "No existe: $PROYECTO"; exit 2; }

  for skill in "${METODO[@]}"; do
    hashes=()
    for ruta in "${RUTAS_SKILL[@]}"; do
      f="$ruta/$skill/SKILL.md"
      if [[ ! -f "$f" ]]; then
        # AC-4: la ausencia es un fallo, no un `continue`. Es lo que dejó pasar el defecto.
        rojo "FALTA · $f"
        faltan=$((faltan + 1))
        continue
      fi
      comprobar_fuga "$f"
      hashes+=("$(sha1sum "$f" | cut -d' ' -f1)")
    done
    distintos=$(printf '%s\n' "${hashes[@]:-}" | sort -u | grep -c .)
    if [[ "$distintos" -gt 1 ]]; then
      rojo "DIVERGE · «$skill» tiene $distintos versiones distintas entre los destinos"
      divergen=$((divergen + 1))
    elif [[ "$distintos" -eq 1 && "${#hashes[@]}" -eq "${#RUTAS_SKILL[@]}" ]]; then
      verde "$skill — $distintos versión en ${#hashes[@]} destinos"
    fi
  done
fi

echo
total=$((faltan + fugas + divergen))
if [[ "$total" -eq 0 ]]; then
  echo "Sin problemas."
  exit 0
fi
echo "Problemas: $faltan ausencia(s) · $fugas fuga(s) · $divergen divergencia(s)"
exit 1
