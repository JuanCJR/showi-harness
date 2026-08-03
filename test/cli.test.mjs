import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { comprobar, normalizarSkills, sincronizar } from '../src/cli.mjs';

const FIXTURE = new URL('./fixtures/one-markdown/showi.yml', import.meta.url).pathname;

let proyecto;
before(() => {
  proyecto = mkdtempSync(join(tmpdir(), 'showi-'));
  cpSync(FIXTURE, join(proyecto, 'showi.yml'));
});
after(() => rmSync(proyecto, { recursive: true, force: true }));

const leer = (rel) => readFileSync(join(proyecto, rel), 'utf8');

describe('sync escribe lo que el perfil declara', () => {
  it('produce un fichero de rol por cada rol del perfil', () => {
    const { escritos } = sincronizar(proyecto);
    for (const rol of ['orchestrator', 'frontend', 'backend']) {
      assert.ok(
        escritos.some((f) => f.endsWith(`subagents/${rol}.md`)),
        `no se escribió el rol ${rol}`,
      );
    }
  });

  it('el rol lleva el modelo de cada herramienta y el método sin tocar', () => {
    sincronizar(proyecto);
    const frontend = leer('.rulesync/subagents/frontend.md');
    assert.match(frontend, /^claudecode:$/m);
    assert.match(frontend, /^ {2}model: opus$/m);
    assert.match(frontend, /^opencode:$/m);
    assert.doesNotMatch(frontend, /^copilot:/m); // sin selección de modelo: no se le inventa
    assert.match(frontend, /spec-driven-development/); // §2, del tronco común
    assert.match(frontend, /RED primero/); // §3, de la parte portable
  });

  it('el perfil rellena §1 y el registro de defectos queda enlazado, no incrustado', () => {
    sincronizar(proyecto);
    const backend = leer('.rulesync/subagents/backend.md');
    assert.match(backend, /apps\/api/);
    assert.match(backend, /docs\/harness\/defectos\.md/);
    // El hallazgo de la fase 3: esto vivía dentro de lo portable y ahora viene del perfil.
    assert.match(backend, /DTO de entrada y salida creados/);
  });

  it('escribe las cuatro configuraciones y son JSON válido', () => {
    sincronizar(proyecto);
    // `rulesync.jsonc` va en la raíz —es donde rulesync lo busca por defecto—; los demás dentro.
    for (const f of ['rulesync.jsonc', '.rulesync/hooks.jsonc', '.rulesync/permissions.jsonc', '.rulesync/mcp.jsonc']) {
      const texto = leer(f);
      assert.match(texto, /GENERADO/);
      assert.doesNotThrow(() => JSON.parse(texto.replace(/^\s*\/\/.*$/gm, '')), f);
    }
  });

  it('escribe las reglas del proyecto, con sus globs de territorio', () => {
    sincronizar(proyecto);
    // Un solo campo `globs:` en la fuente; rulesync lo traduce a `paths:`, `applyTo:` e
    // `inclusion: fileMatch` según la herramienta. Cinco dialectos, un dato.
    assert.match(leer('.rulesync/rules/00-producto.md'), /root: true/);
    assert.match(leer('.rulesync/rules/20-territorio-frontend.md'), /globs: \["apps\/web\/\*\*"/);
    assert.match(leer('.rulesync/rules/20-territorio-backend.md'), /apps\/api/);
  });

  it('deja la instrumentación donde el perfil dice, con sus territorios', () => {
    sincronizar(proyecto);
    const cfg = JSON.parse(leer('.harness/config.json'));
    assert.deepEqual(cfg.territorios.sort(), ['apps/api/', 'apps/web/', 'packages/shared/']);
    // La regla de AC-11 viaja con el fichero: si alguien copiara aquí otro adaptador, se nota.
    assert.match(leer('.harness/hooks/_payload.py'), /nunca\s+un\s+valor\s+por\s+defecto/i);
  });

  it('es idempotente: dos pasadas dejan lo mismo', () => {
    sincronizar(proyecto);
    const antes = leer('.rulesync/subagents/frontend.md');
    sincronizar(proyecto);
    assert.equal(leer('.rulesync/subagents/frontend.md'), antes);
  });

  it('se niega a sincronizar un perfil inválido, y nombra el campo', () => {
    const roto = mkdtempSync(join(tmpdir(), 'showi-roto-'));
    const perfil = readFileSync(FIXTURE, 'utf8').replace(/^ {2}slug: .*$/m, '');
    writeFileSync(join(roto, 'showi.yml'), perfil);
    assert.throws(() => sincronizar(roto), /proyecto\.slug/);
    rmSync(roto, { recursive: true, force: true });
  });
});

describe('una skill de origen con el nombre mal se normaliza, y se dice', () => {
  // El estándar exige que `name` sea el del directorio. Hay skills publicadas que lo incumplen, y
  // la mayoría de herramientas lo tragan; Kiro **aborta la generación entera** y deja el árbol a
  // medias sin decir por qué. Esto lo absorbe entre instalar y repartir, en voz alta.
  const preparar = (nombreDeclarado) => {
    const dir = join(proyecto, '.rulesync/skills/.curated/composition-patterns');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${nombreDeclarado}\ndescription: x\n---\n\ncuerpo\n`);
    return join(dir, 'SKILL.md');
  };

  it('corrige el nombre al del directorio y lo reporta', () => {
    const ruta = preparar('vercel-composition-patterns');
    const { corregidas } = normalizarSkills(proyecto, { silencioso: true });
    assert.deepEqual(corregidas, [{ dir: 'composition-patterns', declaraba: 'vercel-composition-patterns' }]);
    assert.match(readFileSync(ruta, 'utf8'), /^name: composition-patterns$/m);
  });

  it('no toca el cuerpo', () => {
    const ruta = preparar('otro-nombre');
    normalizarSkills(proyecto, { silencioso: true });
    assert.match(readFileSync(ruta, 'utf8'), /\ncuerpo\n/);
  });

  it('no reporta nada cuando el nombre ya cuadra', () => {
    preparar('composition-patterns');
    assert.deepEqual(normalizarSkills(proyecto, { silencioso: true }).corregidas, []);
  });
});

// ── AC-13 y AC-14 ────────────────────────────────────────────────────────────────────────────
describe('check detecta la deriva', () => {
  it('no encuentra nada justo después de sincronizar', () => {
    sincronizar(proyecto);
    assert.deepEqual(comprobar(proyecto).problemas, []);
  });

  it('AC-13 · editar a mano un generado se detecta, y se dice cuál', () => {
    sincronizar(proyecto);
    const ruta = '.rulesync/subagents/frontend.md';
    writeFileSync(join(proyecto, ruta), leer(ruta) + '\ntocado a mano\n');
    const { problemas } = comprobar(proyecto);
    assert.equal(problemas.length, 1);
    assert.match(problemas[0], /frontend\.md/);
    sincronizar(proyecto);
    assert.deepEqual(comprobar(proyecto).problemas, []); // restaurado
  });

  it('AC-13 bis · borrar un generado también se detecta', () => {
    sincronizar(proyecto);
    rmSync(join(proyecto, '.rulesync/subagents/backend.md'));
    assert.match(comprobar(proyecto).problemas.join(' '), /backend\.md/);
    sincronizar(proyecto);
  });

  it('AC-14 · cambiar el perfil sin regenerar se detecta', () => {
    sincronizar(proyecto);
    const perfil = leer('showi.yml');
    writeFileSync(join(proyecto, 'showi.yml'), perfil.replace('model: opus, effort: high', 'model: haiku'));
    assert.ok(comprobar(proyecto).problemas.length > 0, 'la deriva del perfil pasó desapercibida');
    writeFileSync(join(proyecto, 'showi.yml'), perfil);
    sincronizar(proyecto);
  });

  it('NO cubre el reparto a las herramientas, y eso hay que saberlo', () => {
    // Verificado en el proyecto real: una línea metida a mano en `.claude/agents/frontend.md` pasa
    // por `showi check` sin que se note. No es un defecto —ese tramo es de rulesync— pero suponer
    // que este comando cubre los dos tramos deja un hueco por el que se cuela justo lo que la
    // comprobación de deriva existe para cazar. Los dos comandos hacen falta.
    sincronizar(proyecto);
    mkdirSync(join(proyecto, '.claude/agents'), { recursive: true });
    writeFileSync(join(proyecto, '.claude/agents/frontend.md'), 'editado a mano\n');
    assert.deepEqual(comprobar(proyecto).problemas, [], 'si esto cambia, actualiza la doc de check');
  });

  it('compara contenido, no solo existencia', () => {
    // La mutación obvia de un `check` es comprobar que el fichero está y dar por bueno lo que tenga.
    sincronizar(proyecto);
    writeFileSync(join(proyecto, 'rulesync.jsonc'), '// vacío\n{}\n');
    assert.match(comprobar(proyecto).problemas.join(' '), /rulesync\.jsonc/);
    sincronizar(proyecto);
  });
});
