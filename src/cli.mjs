#!/usr/bin/env node
/**
 * showi — el método, llevado a cualquier proyecto y a cualquier herramienta.
 *
 * `sync` es la única operación que escribe, y todo lo que escribe es **derivable del perfil**. Por
 * eso `check` puede volver a derivarlo y comparar: si algo no coincide, o alguien editó un generado
 * a mano, o alguien cambió el perfil y no regeneró. Las dos cosas hay que saberlas **antes** de que
 * un `update` pase por encima.
 *
 * `derivar()` es una sola fuente para las dos operaciones. Si `sync` y `check` construyeran cada uno
 * lo suyo, acabarían discrepando y el `check` diría que todo está bien.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parse } from 'yaml';

import { hooksConfig, mcpConfig, permisosConfig, rulesyncConfig } from './config.mjs';
import { render } from './render.mjs';
import { bloquesDeModelo } from './roles.mjs';
import { validar } from './esquema.mjs';

const AQUI = new URL('..', import.meta.url).pathname;
const VERSION = JSON.parse(readFileSync(join(AQUI, 'package.json'), 'utf8')).version;

const plantilla = (...t) => readFileSync(join(AQUI, 'templates', ...t), 'utf8');

/** Lee y valida el perfil. Uno inválido para aquí, nombrando el campo. */
function perfilDe(proyecto) {
  const perfil = parse(readFileSync(join(proyecto, 'showi.yml'), 'utf8'));
  const problemas = validar(perfil);
  if (problemas.length > 0) {
    throw new Error(
      `El perfil no es válido:\n${problemas.map((p) => `  ${p.ruta}: ${p.problema}`).join('\n')}`,
    );
  }
  return perfil;
}

/**
 * Todo lo que `sync` escribiría, como pares ruta → contenido. **No toca el disco**: es lo que
 * permite que `check` compare sin escribir, y que las dos operaciones no puedan divergir.
 */
export function derivar(perfil) {
  const salida = new Map();
  const activas = perfil.herramientas.activas;
  const metodoComun = plantilla('roles', '_comun', 'metodo.md');

  for (const [nombre, rol] of Object.entries(perfil.roles)) {
    const ctx = {
      ...rol,
      nombre,
      registro_defectos: perfil.documentos?.registro_defectos,
      documentos: perfil.documentos,
      bloques_de_modelo: bloquesDeModelo(nombre, perfil.modelos ?? {}, activas),
      ejecutores: Object.entries(perfil.roles)
        .filter(([, r]) => r.territorio)
        .map(([n, r]) => ({ nombre: n, territorio: r.territorio.join(', ') })),
    };
    const t = rol.plantilla;
    salida.set(
      `.rulesync/subagents/${nombre}.md`,
      render(plantilla('roles', t, 'frontmatter.yml.tmpl'), ctx) +
        '\n' +
        render(plantilla('roles', t, 'perfil.md.tmpl'), ctx) +
        '\n---\n\n' +
        metodoComun +
        '\n' +
        plantilla('roles', t, 'portable.md') +
        '\n---\n\n' +
        render(plantilla('roles', t, 'cierre.md.tmpl'), ctx),
    );
  }

  for (const [fichero, tmpl, cuerpo] of [
    ['rulesync.jsonc', 'rulesync.jsonc.tmpl', rulesyncConfig(perfil, perfil.showi.metodo)],
    ['hooks.jsonc', 'hooks.jsonc.tmpl', hooksConfig(perfil)],
    ['permissions.jsonc', 'permissions.jsonc.tmpl', permisosConfig(perfil)],
    ['mcp.jsonc', 'mcp.jsonc.tmpl', mcpConfig(perfil)],
  ]) {
    salida.set(
      `.rulesync/${fichero}`,
      render(plantilla('config', tmpl), {
        version: VERSION,
        cuerpo: JSON.stringify(cuerpo, null, 2),
      }),
    );
  }

  // Lo que los hooks necesitan saber del proyecto y no puede vivir dentro de un script que se copia
  // tal cual. Los territorios **salen de los roles**: repetirlos en el perfil sería un segundo sitio
  // donde decir lo mismo, y dos sitios divergen.
  const destino = perfil.instrumentacion?.destino ?? '.harness';
  const territorios = [
    ...new Set(
      Object.values(perfil.roles)
        .flatMap((r) => r.territorio ?? [])
        .map((t) => t.replace(/\*+$/, '')),
    ),
  ].sort();
  salida.set(`${destino}/config.json`, `${JSON.stringify({ territorios }, null, 2)}\n`);

  const ejemplo = Object.values(perfil.roles).find((r) => r.verificacion)?.verificacion?.[0]?.cmd;
  for (const doc of ['spec', 'plan', 'tasks', 'CHANGELOG']) {
    salida.set(
      `${perfil.documentos.plantillas_dir}/${doc}.md`,
      render(plantilla('specs', `${doc}.md.tmpl`), {
        proyecto: perfil.proyecto,
        documentos: perfil.documentos,
        ejemplo_verificacion: ejemplo,
      }),
    );
  }

  return salida;
}

/** Escribe lo derivado, y copia la instrumentación —que se copia tal cual, no se deriva—. */
export function sincronizar(proyecto, opciones = {}) {
  const perfil = perfilDe(proyecto);
  const escritos = [];

  for (const [rel, contenido] of derivar(perfil)) {
    const ruta = join(proyecto, rel);
    mkdirSync(dirname(ruta), { recursive: true });
    writeFileSync(ruta, contenido);
    escritos.push(rel);
  }

  if (perfil.instrumentacion?.habilitada) {
    const dir = perfil.instrumentacion.destino ?? '.harness';
    mkdirSync(join(proyecto, dir, 'hooks'), { recursive: true });
    for (const f of readdirSync(join(AQUI, 'instrumentacion')).filter((f) => f.endsWith('.py'))) {
      cpSync(join(AQUI, 'instrumentacion', f), join(proyecto, dir, 'hooks', f));
      escritos.push(`${dir}/hooks/${f}`);
    }
  }

  if (!opciones.silencioso) console.log(`showi sync · ${escritos.length} ficheros`);
  return { escritos };
}

/**
 * Vuelve a derivar y compara **contenido**, no existencia. Comprobar solo que el fichero está
 * dejaría pasar justo el caso que importa: alguien lo editó a mano y sigue ahí.
 */
export function comprobar(proyecto) {
  const problemas = [];
  for (const [rel, esperado] of derivar(perfilDe(proyecto))) {
    const ruta = join(proyecto, rel);
    if (!existsSync(ruta)) problemas.push(`falta: ${rel}`);
    else if (readFileSync(ruta, 'utf8') !== esperado) problemas.push(`ha derivado: ${rel}`);
  }
  return { problemas };
}

// ── invocación por línea de comandos ─────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith('cli.mjs') || process.argv[1]?.endsWith('showi')) {
  const [orden, proyecto = process.cwd()] = process.argv.slice(2);
  try {
    if (orden === 'sync') {
      sincronizar(proyecto);
    } else if (orden === 'check') {
      const { problemas } = comprobar(proyecto);
      if (problemas.length === 0) {
        console.log('showi check · sin deriva');
      } else {
        console.error(`showi check · ${problemas.length} problema(s):`);
        for (const p of problemas) console.error(`  ${p}`);
        process.exit(1);
      }
    } else {
      console.error('uso: showi <sync|check> [proyecto]');
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
