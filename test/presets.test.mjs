import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parse } from 'yaml';

import { bloqueDePerfil, catalogo, preset } from '../src/presets.mjs';
import { iniciar } from '../src/ciclo.mjs';
import { comprobar } from '../src/cli.mjs';

/**
 * El catálogo son **arquetipos, no proyectos**. `frontend` dice qué hace ese rol —interfaz, estado,
 * accesibilidad, tests desde el usuario— sin nombrar ningún framework. Lo que cambia entre
 * proyectos —stack, territorio, comandos— lo pone el perfil.
 *
 * Si un preset nombrara un stack, el catálogo envejecería con el framework que nombra y el segundo
 * proyecto tendría que borrar más de lo que aprovecha. Es la misma regla que sostiene las skills de
 * método, aplicada un nivel más arriba.
 */

// Lo que un preset NO puede pronunciar. Misma lista que el guardián del método.
const STACK =
  /\b(react|vue|svelte|angular|next\.?js|nestjs|express|fastapi|django|rails|spring|vitest|jest|pytest|playwright|cypress|prisma|zustand|redux|tailwind|postgres|mysql|mongodb|redis|pnpm|npm|yarn|poetry|cargo|gradle|maven|typescript|python|golang)\b/i;

describe('el catálogo existe y es legible', () => {
  it('trae al menos los tres primeros roles', () => {
    const nombres = catalogo().map((p) => p.nombre);
    for (const n of ['orchestrator', 'frontend', 'backend']) {
      assert.ok(nombres.includes(n), `falta el preset «${n}»: ${nombres.join(', ')}`);
    }
  });

  it('cada preset dice de qué plantilla sale', () => {
    for (const p of catalogo()) {
      assert.ok(['orquestador', 'implementador'].includes(p.plantilla), `${p.nombre}: ${p.plantilla}`);
    }
  });

  it('cada preset trae identidad y descripción, que es lo que decide cuándo se invoca', () => {
    for (const p of catalogo()) {
      assert.ok(p.identidad?.length > 20, `${p.nombre} sin identidad`);
      assert.ok(p.descripcion?.length > 40, `${p.nombre} sin descripción usable`);
    }
  });

  it('un nombre que no existe devuelve null, no revienta', () => {
    assert.equal(preset('no-existe'), null);
  });
});

describe('ningún preset nombra un stack', () => {
  // La propiedad que hace que el catálogo sirva a cualquier proyecto. Sin esto, en dos años el
  // catálogo habla de frameworks que ya no se usan y hay que reescribirlo entero.
  for (const p of catalogo()) {
    it(`«${p.nombre}» es arquetipo, no proyecto`, () => {
      const texto = JSON.stringify(p);
      const fuga = texto.match(STACK);
      assert.equal(fuga, null, `«${p.nombre}» nombra «${fuga?.[0]}»`);
    });
  }

  it('tampoco nombran rutas concretas de ningún proyecto', () => {
    for (const p of catalogo()) {
      assert.doesNotMatch(JSON.stringify(p), /apps\/(web|api)|packages\/shared|one-markdown/);
    }
  });
});

describe('el preset se convierte en un bloque de perfil', () => {
  it('produce YAML válido que conserva lo del arquetipo', () => {
    const bloque = parse(`roles:\n${bloqueDePerfil('frontend')}`);
    const rol = bloque.roles.frontend;
    assert.equal(rol.plantilla, 'implementador');
    assert.equal(rol.preset, 'frontend');
    assert.ok(rol.identidad.length > 20);
  });

  it('deja como TODO lo que solo puede saber el proyecto', () => {
    // Un bloque relleno con valores inventados es peor que uno con TODO: parece configurado.
    const rol = parse(`roles:\n${bloqueDePerfil('backend')}`).roles.backend;
    for (const campo of ['stack', 'territorio', 'verificacion']) {
      assert.match(JSON.stringify(rol[campo] ?? ''), /TODO/i, `${campo} debería estar por rellenar`);
    }
  });

  it('el orquestador no lleva territorio: no escribe código', () => {
    const rol = parse(`roles:\n${bloqueDePerfil('orchestrator')}`).roles.orchestrator;
    assert.equal(rol.territorio, undefined);
  });
});

describe('init elige del catálogo', () => {
  const conRoles = (roles) => {
    const d = mkdtempSync(join(tmpdir(), 'showi-pre-'));
    iniciar(d, { nombre: 'X', slug: 'x', roles }, { silencioso: true });
    return d;
  };

  it('escribe solo los roles pedidos', () => {
    const d = conRoles(['orchestrator', 'backend']);
    const perfil = parse(readFileSync(join(d, 'showi.yml'), 'utf8'));
    assert.deepEqual(Object.keys(perfil.roles).sort(), ['backend', 'orchestrator']);
    rmSync(d, { recursive: true, force: true });
  });

  it('lo que escribe es un perfil válido y sincronizable', () => {
    const d = conRoles(['orchestrator', 'frontend', 'backend']);
    assert.deepEqual(comprobar(d).problemas, [], 'lo que init deja no pasa su propio check');
    rmSync(d, { recursive: true, force: true });
  });

  it('el perfil que deja está COMPLETO, no cortado por donde entran los roles', () => {
    // Se perdió de verdad: al insertar el marcador de roles se truncó la plantilla y todo proyecto
    // creado con `init` nacía **sin instrumentación**, que es la mitad del valor del montaje. Lo
    // encontró el primer proyecto ajeno, no un test. Este caso existe para que no vuelva.
    const d = conRoles(['orchestrator']);
    const perfil = parse(readFileSync(join(d, 'showi.yml'), 'utf8'));
    assert.equal(perfil.instrumentacion?.habilitada, true, 'nace sin medición');
    assert.ok(perfil.instrumentacion.hooks, 'sin hooks declarados no se mide nada');
    for (const seccion of ['showi', 'proyecto', 'documentos', 'herramientas', 'modelos', 'roles']) {
      assert.ok(perfil[seccion], `falta la sección «${seccion}»`);
    }
    rmSync(d, { recursive: true, force: true });
  });

  it('para si se le pide un rol que no está en el catálogo, y lo nombra', () => {
    const d = mkdtempSync(join(tmpdir(), 'showi-pre-mal-'));
    assert.throws(() => iniciar(d, { nombre: 'X', slug: 'x', roles: ['inventado'] }), /inventado/);
    rmSync(d, { recursive: true, force: true });
  });
});
