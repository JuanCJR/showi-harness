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

const REPO_METODO = 'https://github.com/JuanCJR/showi-harness.git';
import { render } from './render.mjs';
import { bloqueDePerfil, catalogo } from './presets.mjs';

const AQUI = new URL('..', import.meta.url).pathname;

// **Una sola fuente.** Estaba escrita también aquí como constante, y se subía a mano en los dos
// sitios: cuatro versiones seguidas con dos oportunidades cada una de divergir. Es literalmente
// «ningún número derivable se escribe a mano» —del método que este repositorio distribuye—
// incumplido por su propia herramienta.
const VERSION_METODO = JSON.parse(readFileSync(join(AQUI, 'package.json'), 'utf8')).version;

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

  // Los roles salen del catálogo. Un nombre que no está **para** el init: dejar el perfil a medias
  // con un rol menos sería peor, porque el fallo aparecería mucho después y lejos de su causa.
  const roles = datos.roles?.length ? datos.roles : ['orchestrator', 'frontend', 'backend'];
  const bloques = roles.map((r) => bloqueDePerfil(r)).join('\n');

  const creados = ['showi.yml'];
  writeFileSync(
    destino,
    render(readFileSync(join(AQUI, 'templates', 'showi.yml.tmpl'), 'utf8'), {
      nombre: datos.nombre ?? 'TODO',
      slug: datos.slug ?? 'todo',
      metodo: datos.metodo ?? VERSION_METODO,
      roles: bloques,
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
    console.log(`\nRoles del catálogo: ${roles.join(', ')}`);
    console.log('Rellena sus TODO en showi.yml y vuelve a correr `showi sync`.');
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
export async function actualizar(proyecto, versionNueva, opciones = {}) {
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

  // El tag tiene que existir **en el remoto**, no en un clon local. Cuando no está, rulesync
  // responde «no commit found for SHA», que se lee como si el origen entero no existiera y manda a
  // buscar el problema donde no está. Avisar aquí cuesta una llamada.
  if (!opciones.sinComprobarTag) {
    try {
      const { execFileSync } = await import('node:child_process');
      const salida = execFileSync('git', ['ls-remote', '--tags', REPO_METODO, `v${versionNueva}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      if (!salida.trim() && !opciones.silencioso) {
        console.warn(
          `showi update · aviso: v${versionNueva} no está publicada como tag en el remoto.\n` +
            `  \`rulesync install\` fallará con «no commit found for SHA», que parece otra cosa.`,
        );
      }
    } catch {
      // Sin red o sin git no se bloquea: avisar es un extra, no una precondición.
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
