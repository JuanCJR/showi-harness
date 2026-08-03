/**
 * El cruce **declarado × presente × habilitado**.
 *
 * Existe porque una skill o un servidor apagado en la configuración **no se puede invocar aunque un
 * rol lo declare obligatorio**, y ese cruce no lo hacía nadie. En el proyecto donde nació este
 * método dejó tres skills muertas durante siete specs, y una skill declarada obligatoria que ni
 * siquiera existía sobrevivió el mismo tiempo.
 *
 * La regla que gobierna todo lo de aquí: **«no medido» no se dice como «cero»**. Un cero de un
 * instrumento desconectado se cita con la misma confianza que un cero real, y esa confusión costó
 * dos conclusiones falsas en la retrospectiva que originó estos hooks.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

import { bloquesDeModelo } from './roles.mjs';

const METODO = [
  'spec-driven-development',
  'test-driven-development-tdd',
  'stop-and-report',
  'verification-and-measurement',
];
const RUTAS_SKILL = [
  '.claude/skills',
  '.cursor/skills',
  '.github/skills',
  '.opencode/skills',
  '.kiro/skills',
  '.agents/skills',
];

const ok = (texto) => ({ nivel: 'ok', texto });
const aviso = (texto) => ({ nivel: 'aviso', texto });
const error = (texto) => ({ nivel: 'error', texto });

const leerJSON = (ruta) => {
  try {
    return JSON.parse(readFileSync(ruta, 'utf8'));
  } catch {
    return null;
  }
};

/** Cuerpo sin frontmatter: el frontmatter lo serializa cada herramienta a su manera (AC-2). */
const cuerpo = (texto) => texto.replace(/^---\n[\s\S]*?\n---\n/, '');

export function diagnosticar(proyecto) {
  const perfil = parse(readFileSync(join(proyecto, 'showi.yml'), 'utf8'));
  const en = (...p) => join(proyecto, ...p);

  return {
    secciones: [
      { titulo: 'MÉTODO', hallazgos: metodo(en, perfil) },
      { titulo: 'SKILLS declaradas × presentes', hallazgos: skills(en, perfil) },
      { titulo: 'MCP declarado × habilitado', hallazgos: mcp(en, perfil) },
      { titulo: 'MODELOS', hallazgos: modelos(perfil) },
      { titulo: 'INSTRUMENTACIÓN', hallazgos: instrumentacion(en, perfil) },
    ],
  };
}

function metodo(en, perfil) {
  const h = [];
  const presentes = METODO.filter((s) => RUTAS_SKILL.every((r) => existsSync(en(r, s, 'SKILL.md'))));
  h.push(
    presentes.length === METODO.length
      ? ok(`${presentes.length}/${METODO.length} skills en las ${RUTAS_SKILL.length} rutas`)
      : error(
          `${presentes.length}/${METODO.length} skills completas — faltan: ` +
            METODO.filter((s) => !presentes.includes(s)).join(', '),
        ),
  );

  for (const s of presentes) {
    const cuerpos = new Set(
      RUTAS_SKILL.map((r) => cuerpo(readFileSync(en(r, s, 'SKILL.md'), 'utf8'))),
    );
    if (cuerpos.size > 1) {
      h.push(error(`«${s}» tiene ${cuerpos.size} versiones distintas del método`));
    }
  }

  // El 422 que costó una vuelta: el perfil pedía un tag que nunca se empujó, y el error de rulesync
  // —«no commit found for SHA»— se lee como si el origen no existiera.
  const pedido = perfil.showi?.metodo;
  const lock = leerJSON(en('rulesync.lock'));
  const fuente = Object.entries(lock?.sources ?? {}).find(([k]) => k.includes('showi-harness'));
  if (!fuente) {
    h.push(aviso(`el perfil pide el método v${pedido} y no consta instalado en el lockfile`));
  } else {
    const ref = fuente[1].requestedRef ?? '?';
    const sha = (fuente[1].resolvedRef ?? '').slice(0, 8);
    h.push(
      String(ref).includes(String(pedido))
        ? ok(`v${pedido} instalado, fijado en el lockfile (${sha})`)
        : aviso(`el perfil pide v${pedido} y el lockfile tiene instalado «${ref}» (${sha})`),
    );
  }
  return h;
}

function skills(en, perfil) {
  const h = [];
  const disponibles = new Set(
    RUTAS_SKILL.flatMap((r) => (existsSync(en(r)) ? readdirSync(en(r)) : [])),
  );

  const declaradas = new Map();
  for (const [rol, datos] of Object.entries(perfil.roles ?? {})) {
    for (const s of datos.skills_stack ?? []) {
      if (!declaradas.has(s.nombre)) declaradas.set(s.nombre, []);
      declaradas.get(s.nombre).push(rol);
    }
  }

  let faltan = 0;
  for (const [nombre, roles] of declaradas) {
    if (!disponibles.has(nombre)) {
      faltan += 1;
      h.push(
        error(`«${nombre}» la declaran obligatoria ${roles.join(', ')} y no existe en ninguna ruta`),
      );
    }
  }
  if (faltan === 0) h.push(ok(`${declaradas.size}/${declaradas.size} skills declaradas existen`));
  return h;
}

function mcp(en, perfil) {
  const h = [];
  const habilitados = new Set(perfil.mcp?.habilitados ?? []);

  const declarados = new Map();
  for (const [rol, datos] of Object.entries(perfil.roles ?? {})) {
    for (const s of datos.mcp ?? []) {
      if (!declarados.has(s.nombre)) declarados.set(s.nombre, []);
      declarados.get(s.nombre).push(rol);
    }
  }

  for (const [nombre, roles] of declarados) {
    if (!habilitados.has(nombre)) {
      h.push(error(`«${nombre}» lo declaran ${roles.join(', ')} y no está habilitado en el perfil`));
    }
  }

  // La configuración local gana sobre la del proyecto y **no está en el repositorio**: es el cruce
  // que nadie mira porque no se ve en un `git diff`.
  const local = leerJSON(en('.claude/settings.local.json'));
  for (const nombre of local?.disabledMcpjsonServers ?? []) {
    const roles = declarados.get(nombre);
    h.push(
      roles
        ? error(
            `«${nombre}» lo declaran ${roles.join(', ')} y está apagado en la configuración local, ` +
              `que gana y no se ve en el repositorio`,
          )
        : aviso(`«${nombre}» apagado en la configuración local`),
    );
  }

  if (h.length === 0) {
    h.push(ok(`${declarados.size}/${declarados.size} servidores declarados están habilitados`));
  }
  return h;
}

function modelos(perfil) {
  const h = [];
  const activas = perfil.herramientas?.activas ?? [];
  for (const rol of Object.keys(perfil.roles ?? {})) {
    const { yaml, degradadas } = bloquesDeModelo.detalle(rol, perfil.modelos ?? {}, activas);
    const conModelo = [...yaml.matchAll(/^(\S+):$/gm)].map((m) => m[1]);
    h.push(ok(`${rol}: ${conModelo.join(' · ') || 'sin modelo en ninguna herramienta'}`));
    if (degradadas.length) {
      // Degradado es una limitación de la herramienta, no un fallo del harness. Llamarlo error
      // haría que se ignoraran los errores de verdad.
      h.push(
        aviso(
          `${rol}: degradado en ${degradadas.join(', ')} — esa herramienta no admite elegir ` +
            `modelo, así que hereda el de la sesión`,
        ),
      );
    }
  }
  return h;
}

function instrumentacion(en, perfil) {
  const h = [];
  if (!perfil.instrumentacion?.habilitada) return [aviso('apagada en el perfil: no se mide nada')];

  const destino = perfil.instrumentacion.destino ?? '.harness';
  for (const [fichero, que] of [
    ['skill-usage.jsonl', 'invocaciones de skill'],
    ['delegation.jsonl', 'escrituras en territorio'],
  ]) {
    const ruta = en(destino, fichero);
    if (!existsSync(ruta)) {
      // **La línea que justifica este comando entero.** Sin registro no hay cero: hay ausencia de
      // medida, y decirlo como «0» es lo que costó dos conclusiones falsas.
      h.push(aviso(`${que}: no medido — no hay registro todavía, que no es lo mismo que cero`));
      continue;
    }
    const lineas = readFileSync(ruta, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (lineas.length === 0) {
      h.push(aviso(`${que}: no medido — el registro está vacío, que no es lo mismo que cero`));
      continue;
    }
    h.push(ok(`${que}: ${lineas.length} registrada(s)`));

    const desconocidas = lineas.filter((l) => l._esquema === 'desconocido');
    if (desconocidas.length) {
      const claves = [...new Set(desconocidas.flatMap((l) => l._claves ?? []))].join(', ');
      h.push(
        aviso(
          `${que}: ${desconocidas.length} con esquema desconocido — es la sonda. Claves reales: ` +
            `${claves || '(ninguna)'}. Añádelas a RUTAS en _payload.py y sube un patch.`,
        ),
      );
    }
    const sinAgente = lineas.filter((l) => 'agent' in l && l.agent === null).length;
    if (sinAgente) {
      h.push(
        aviso(
          `${que}: ${sinAgente} sin identificador de agente — la herramienta no lo manda, así que ` +
            `el ratio de delegación es no medible ahí. No se rellena.`,
        ),
      );
    }
  }
  return h;
}

/** Informe legible. La marca va delante para poder filtrar por nivel con `grep`. */
export function formatear(informe) {
  const marca = { ok: '✓', aviso: '⚠', error: '✗' };
  const lineas = [];
  for (const s of informe.secciones) {
    lineas.push(`\n${s.titulo}`);
    for (const h of s.hallazgos) lineas.push(`  ${marca[h.nivel]} ${h.texto}`);
  }
  return lineas.join('\n');
}
