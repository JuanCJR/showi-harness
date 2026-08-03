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
import { diagnosticar, formatear } from './doctor.mjs';

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
      // Precalculado, no decidido en la plantilla: el motor no tiene condicionales a propósito.
      tiene_extras: rol.reporta_ademas?.length ? [true] : [],
      tests: (rol.tests ?? []).map((t) => ({ ...t, nota: t.nota ?? '' })),
      verificacion: (rol.verificacion ?? []).map((v) => ({
        ...v,
        comentario: v.que ? `    # ${v.que}` : '',
      })),
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
      [
        render(plantilla('roles', t, 'frontmatter.yml.tmpl'), ctx),
        render(plantilla('roles', t, 'perfil.md.tmpl'), ctx),
        '---',
        metodoComun,
        plantilla('roles', t, 'portable.md'),
        '---',
        render(plantilla('roles', t, 'cierre.md.tmpl'), ctx),
      ]
        .map((trozo) => trozo.trim())
        .join('\n\n')
        // Normaliza el espaciado del ensamblado: un bloque opcional vacío deja huecos, y un
        // documento con huecos de tres líneas se lee como si le faltara algo.
        .replace(/\n{3,}/g, '\n\n') + '\n',
    );
  }

  for (const [fichero, tmpl, cuerpo] of [
    ['rulesync.jsonc', 'rulesync.jsonc.tmpl', rulesyncConfig(perfil, perfil.showi.metodo)],
    ['hooks.jsonc', 'hooks.jsonc.tmpl', hooksConfig(perfil)],
    ['permissions.jsonc', 'permissions.jsonc.tmpl', permisosConfig(perfil)],
    ['mcp.jsonc', 'mcp.jsonc.tmpl', mcpConfig(perfil)],
  ]) {
    salida.set(
      // `rulesync.jsonc` en la raíz porque es donde rulesync lo busca por defecto; los demás
      // dentro de `.rulesync/`, que es de donde los lee.
      fichero === 'rulesync.jsonc' ? fichero : `.rulesync/${fichero}`,
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

  const ejecutores = Object.entries(perfil.roles)
    .filter(([, r]) => r.territorio)
    .map(([n, r]) => ({ nombre: n, territorio: r.territorio.join(', ') }));

  salida.set(
    '.rulesync/rules/00-producto.md',
    render(plantilla('rules', '00-producto.md.tmpl'), {
      proyecto: perfil.proyecto,
      documentos: perfil.documentos,
      reglas_codigo: perfil.reglas_codigo ?? [],
      tiene_reglas_codigo: perfil.reglas_codigo?.length ? [true] : [],
      ejecutores,
      roles_orquestador:
        Object.entries(perfil.roles).find(([, r]) => r.plantilla === 'orquestador')?.[0] ?? '',
    }),
  );

  for (const [nombre, rol] of Object.entries(perfil.roles)) {
    if (!rol.territorio) continue;
    salida.set(
      `.rulesync/rules/20-territorio-${nombre}.md`,
      render(plantilla('rules', '20-territorio.md.tmpl'), {
        ...rol,
        nombre,
        // Los globs viajan como JSON: es el mismo campo que rulesync traduce a `paths:` en una
        // herramienta, `applyTo:` en otra y `inclusion: fileMatch` en Kiro. Cinco dialectos, un dato.
        globs: JSON.stringify(rol.territorio),
      }),
    );
  }

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

/**
 * El estándar de skills exige que el `name` del frontmatter sea el del directorio. Algunas skills
 * publicadas lo incumplen —declaran un nombre y viven en otra carpeta—, y la mayoría de herramientas
 * lo tragan en silencio. Kiro no: **aborta la generación entera**, y entonces el árbol se queda a
 * medias sin que el mensaje diga por qué.
 *
 * Se normaliza aquí, entre instalar y repartir, y **se dice cuál**. No se toca el origen: la próxima
 * instalación lo traerá igual de mal y esto volverá a corregirlo, así que la comprobación de
 * integridad del lockfile sigue valiendo.
 */
export function normalizarSkills(proyecto, opciones = {}) {
  const raiz = join(proyecto, '.rulesync', 'skills', '.curated');
  const corregidas = [];
  if (!existsSync(raiz)) return { corregidas };

  for (const dir of readdirSync(raiz)) {
    const ruta = join(raiz, dir, 'SKILL.md');
    if (!existsSync(ruta)) continue;
    const texto = readFileSync(ruta, 'utf8');
    const m = texto.match(/^(---\r?\n(?:.*\r?\n)*?)name:[ \t]*(\S+)[ \t]*(\r?\n)/);
    if (!m || m[2] === dir) continue;
    writeFileSync(ruta, texto.replace(/^name:[ \t]*\S+[ \t]*$/m, `name: ${dir}`));
    corregidas.push({ dir, declaraba: m[2] });
  }

  if (corregidas.length && !opciones.silencioso) {
    for (const c of corregidas) {
      console.warn(`showi · «${c.dir}» declaraba name: ${c.declaraba} — corregido al del directorio`);
    }
  }
  return { corregidas };
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
    } else if (orden === 'normaliza') {
      // Va **entre** `rulesync install` y `rulesync generate`.
      const { corregidas } = normalizarSkills(proyecto);
      console.log(`showi normaliza · ${corregidas.length} skill(s) corregida(s)`);
    } else if (orden === 'doctor') {
      const informe = diagnosticar(proyecto);
      console.log(formatear(informe));
      const errores = informe.secciones.flatMap((s) => s.hallazgos).filter((h) => h.nivel === 'error');
      // Los avisos **no** hacen fallar: degradado no es roto, y no medido no es cero. Si un aviso
      // saliera con 1, se acabarían silenciando todos y con ellos los errores de verdad.
      if (errores.length) {
        console.error(`\nshowi doctor · ${errores.length} error(es)`);
        process.exit(1);
      }
      console.log('\nshowi doctor · sin errores');
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
      console.error('uso: showi <sync|normaliza|check|doctor> [proyecto]');
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
