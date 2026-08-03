/**
 * `init` y `update` — el ciclo de vida del harness dentro de un proyecto.
 *
 * `update` es **la razón de ser de este repositorio**. Todo lo demás sirve para llevar el método a
 * un proyecto una vez; esto es lo que hace que una mejora llegue a los proyectos que **ya lo
 * instalaron**, que es el fallo por el que existe todo: una copia manual diverge desde el día uno y
 * no recibe nunca una corrección.
 *
 * Y lo que lo hace usable no es que actualice, sino que **no se lleve nada por delante**. Un
 * proyecto maduro tiene en su perfil y en su registro de defectos lo más caro de reconstruir que
 * tiene.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { comprobar, sincronizar } from './cli.mjs';
import { render } from './render.mjs';

const AQUI = new URL('..', import.meta.url).pathname;
const VERSION_METODO = '0.1.0';

/**
 * Crea el perfil de un proyecto nuevo y lo sincroniza. El perfil nace con marcadores `TODO`
 * a propósito: un perfil relleno con los datos de otro proyecto es peor que uno vacío, porque
 * parece configurado.
 */
export function iniciar(proyecto, datos = {}, opciones = {}) {
  const destino = join(proyecto, 'showi.yml');
  if (existsSync(destino)) {
    throw new Error(
      `Ya existe un showi.yml en ${proyecto}. ` +
        `Para traer una versión nueva del método usa \`showi update\`, que no lo sobreescribe.`,
    );
  }

  const creados = ['showi.yml'];
  writeFileSync(
    destino,
    render(readFileSync(join(AQUI, 'templates', 'showi.yml.tmpl'), 'utf8'), {
      nombre: datos.nombre ?? 'TODO',
      slug: datos.slug ?? 'todo',
      metodo: datos.metodo ?? VERSION_METODO,
    }),
  );

  // El registro de defectos nace **vacío**: los de otro proyecto no son los tuyos, y una regla con
  // la historia equivocada se obedece peor que una sin historia.
  const registro = join(proyecto, 'docs', 'harness', 'defectos.md');
  if (!existsSync(registro)) {
    mkdirSync(join(proyecto, 'docs', 'harness'), { recursive: true });
    writeFileSync(
      registro,
      '# Registro de defectos de este proyecto\n\n' +
        'Cada regla del método salió de un defecto real. Aquí van **los de este repositorio**, con\n' +
        'la forma exacta que tomaron: una regla sin su historia se obedece a medias.\n\n' +
        'Empieza vacío. Se llena cuando ocurra el primero.\n\n' +
        'Este documento **no se genera y no se porta**: sobrevive a cualquier `showi update`.\n',
    );
    creados.push('docs/harness/defectos.md');
  }

  sincronizar(proyecto, opciones);
  if (!opciones.silencioso) {
    console.log(`\nshowi init · ${creados.join(' · ')} y el árbol sincronizado\n`);
    // Se dice el paso que falta en vez de dejar que `doctor` lo descubra como error: el método
    // todavía no está descargado, y un «listo» seguido de un error es la peor primera impresión
    // que puede dar una herramienta cuyo argumento entero es no mentir sobre su estado.
    console.log('Falta traer el método. Todavía NO está instalado:');
    console.log('  export GITHUB_TOKEN=$(gh auth token)');
    console.log('  npx rulesync@latest install');
    console.log('  showi normaliza');
    console.log('  npx rulesync@latest generate');
    console.log('\nY luego rellena los TODO de showi.yml y vuelve a correr `showi sync`.');
    console.log('`showi doctor` te dirá qué falta en cada momento.');
  }
  return { creados };
}

/**
 * Sube la versión del método y regenera. **De `showi.yml` cambia una sola línea**, y no toca nada
 * más del proyecto.
 *
 * Antes de escribir comprueba que el generado no esté ya divergido a mano: sobreescribir un cambio
 * local que nadie recuerda haber hecho es peor que no actualizar. Es el contrato de parada aplicado
 * a la propia herramienta.
 */
export function actualizar(proyecto, versionNueva, opciones = {}) {
  const ruta = join(proyecto, 'showi.yml');
  const perfil = readFileSync(ruta, 'utf8');
  const actual = perfil.match(/^ {2}metodo: "(.*)"$/m)?.[1];

  if (actual === versionNueva) {
    if (!opciones.silencioso) console.log(`showi update · ya estás en v${versionNueva}`);
    return { aplicado: false, de: actual, a: versionNueva };
  }

  if (!opciones.forzar) {
    const { problemas } = comprobar(proyecto);
    if (problemas.length > 0) {
      throw new Error(
        `El generado ya está divergido; no se actualiza por encima:\n` +
          problemas.map((p) => `  ${p}`).join('\n') +
          `\n\nRegenera con \`showi sync\` y vuelve a intentarlo, o usa --forzar si esos cambios ` +
          `se pueden perder.`,
      );
    }
  }

  writeFileSync(ruta, perfil.replace(/^ {2}metodo: ".*"$/m, `  metodo: "${versionNueva}"`));
  sincronizar(proyecto, { silencioso: true });

  if (!opciones.silencioso) {
    console.log(`showi update · método v${actual} → v${versionNueva}`);
    console.log('  regenerado: roles, reglas, configuración e instrumentación');
    console.log('  SIN TOCAR:  showi.yml (salvo la versión) · el registro de defectos · las specs');
    console.log('\n  Falta traer el método nuevo:  npx rulesync install && showi normaliza && npx rulesync generate');
  }
  return { aplicado: true, de: actual, a: versionNueva };
}
