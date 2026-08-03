/**
 * Catálogo de roles: **arquetipos, no proyectos**.
 *
 * `frontend` dice qué hace ese rol —interfaz, estado, navegación, accesibilidad, tests desde el
 * usuario— **sin nombrar ninguna librería**. Lo que cambia entre proyectos —el stack, el territorio,
 * los comandos— lo pone el perfil, y el perfil siempre gana.
 *
 * La razón es la misma que sostiene las skills de método, un nivel más arriba: un catálogo que
 * nombra frameworks envejece con ellos, y el segundo proyecto tendría que borrar más de lo que
 * aprovecha. Hay un test que lo hace exigible.
 *
 * Para añadir un rol basta con dejar un `.yml` aquí. No hay lista que actualizar.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';

const DIR = new URL('../presets/', import.meta.url).pathname;

let cache;

/** Todos los roles disponibles, ordenados. */
export function catalogo() {
  cache ??= readdirSync(DIR)
    .filter((f) => f.endsWith('.yml'))
    .map((f) => parse(readFileSync(join(DIR, f), 'utf8')))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  return cache;
}

/** Uno por nombre, o `null`. No lanza: quien pregunta decide qué hacer con la ausencia. */
export function preset(nombre) {
  return catalogo().find((p) => p.nombre === nombre) ?? null;
}

/**
 * Convierte un preset en el bloque de `roles:` que va al perfil.
 *
 * Lo que el arquetipo sabe entra resuelto; **lo que solo puede saber el proyecto entra como
 * `TODO`**. Rellenarlo con valores inventados sería peor que dejarlo vacío: un perfil que parece
 * configurado y no lo está se revisa menos que uno que pide a gritos que lo completen.
 */
export function bloqueDePerfil(nombre) {
  const p = preset(nombre);
  if (!p) {
    throw new Error(
      `No hay ningún rol «${nombre}» en el catálogo. Disponibles: ` +
        catalogo()
          .map((x) => x.nombre)
          .join(', '),
    );
  }

  const rol = {
    // Queda escrito de dónde salió: sin esto, dentro de seis meses nadie sabe si un rol se escribió
    // a mano o vino del catálogo, ni contra qué comparar cuando el catálogo mejore.
    preset: p.nombre,
    plantilla: p.plantilla,
    descripcion: p.descripcion,
    identidad: p.identidad,
    dominio: 'TODO: qué construye este rol en este proyecto concreto.',
    stack: 'TODO: las tecnologías de este rol. Es lo único que el catálogo no puede saber.',
    verificacion: [{ cmd: 'TODO: el comando que ejercita este territorio', que: '' }],
  };

  if (p.territorio_sugerido) {
    rol.territorio = p.territorio_sugerido;
    rol.fronteras = 'TODO: dónde puedes escribir y dónde no, y qué haces si necesitas cruzar.';
    rol.tests = [{ nivel: 'TODO', ruta: 'TODO', nota: '' }];
  }
  if (p.tests_minimos_sugerido) rol.tests_minimos = p.tests_minimos_sugerido;
  if (p.reporta_ademas_sugerido) rol.reporta_ademas = p.reporta_ademas_sugerido;
  if (p.secciones_casa_sugeridas) rol.secciones_casa = p.secciones_casa_sugeridas;

  // Se indenta a mano porque el bloque se inserta dentro de `roles:` en una plantilla de texto.
  return stringify({ [p.nombre]: rol }, { lineWidth: 100 })
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n');
}
