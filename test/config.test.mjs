import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parse } from 'yaml';

import { hooksConfig, mcpConfig, permisosConfig, rulesyncConfig } from '../src/config.mjs';
import { render } from '../src/render.mjs';

const PERFIL = parse(
  readFileSync(new URL('./fixtures/one-markdown/showi.yml', import.meta.url), 'utf8'),
);
const leerPlantilla = (rel) =>
  readFileSync(new URL(`../templates/${rel}`, import.meta.url), 'utf8');

// ── T-010 ────────────────────────────────────────────────────────────────────────────────────
describe('rulesync.jsonc sale del perfil', () => {
  const c = () => rulesyncConfig(PERFIL, '0.1.0');

  it('los destinos son los que declara el perfil, ni uno más', () => {
    assert.deepEqual(Object.keys(c().targets).sort(), [...PERFIL.herramientas.activas].sort());
  });

  it('las skills de terceros se traducen a `sources`, una por origen y ruta', () => {
    const fuentes = c().sources;
    // +1 por el propio método, que es la primera fuente y va fijada por tag.
    assert.equal(fuentes.length, PERFIL.skills_terceros.length + 1);
    assert.match(fuentes[0].source, /showi-harness@/);
  });

  it('el método entra con las cuatro skills y la regla raíz', () => {
    const metodo = c().sources[0];
    assert.deepEqual(metodo.skills.sort(), [
      'spec-driven-development',
      'stop-and-report',
      'test-driven-development-tdd',
      'verification-and-measurement',
    ]);
    assert.deepEqual(metodo.rules, ['metodo']);
  });

  it('la versión del método viaja en el tag, no en una rama', () => {
    // Una rama haría que dos clones del mismo commit instalaran métodos distintos.
    assert.match(rulesyncConfig(PERFIL, '1.2.3').sources[0].source, /@v1\.2\.3$/);
  });
});

describe('los hooks salen del perfil', () => {
  it('emite los dos hooks con su matcher y su evento', () => {
    const h = hooksConfig(PERFIL).hooks;
    assert.equal(h.postToolUse[0].matcher, 'Skill');
    assert.equal(h.preToolUse[0].matcher, 'Write|Edit|NotebookEdit');
  });

  it('los comandos apuntan al destino que declara el perfil', () => {
    const h = hooksConfig(PERFIL).hooks;
    for (const hook of [...h.preToolUse, ...h.postToolUse]) {
      assert.ok(hook.command.includes(PERFIL.instrumentacion.destino), hook.command);
    }
  });

  it('un hook desactivado en el perfil no se emite', () => {
    const apagado = structuredClone(PERFIL);
    apagado.instrumentacion.hooks.delegation_watch.activo = false;
    assert.equal(hooksConfig(apagado).hooks.preToolUse.length, 0);
  });

  it('la instrumentación entera se puede apagar', () => {
    const apagada = structuredClone(PERFIL);
    apagada.instrumentacion.habilitada = false;
    assert.deepEqual(hooksConfig(apagada), {});
  });
});

describe('los permisos salen del perfil', () => {
  it('conserva el reparto de allow y deny sin inventarse ninguno', () => {
    const p = permisosConfig(PERFIL);
    const esperados = Object.entries(PERFIL.permisos.bash).filter(([, v]) => v === 'deny').length;
    assert.equal(Object.values(p.permission.bash).filter((v) => v === 'deny').length, esperados);
    assert.equal(Object.keys(p.permission.bash).length, Object.keys(PERFIL.permisos.bash).length);
  });

  it('los deny de secretos sobreviven', () => {
    assert.equal(permisosConfig(PERFIL).permission.read['./**/.env.*'], 'deny');
  });

  it('va envuelto en `permission`, que es lo que rulesync valida', () => {
    // Sin la envoltura, rulesync rechaza el fichero entero y **no aplica ningún permiso**. El
    // error se pierde entre el resto de la salida, así que el fallo es silencioso en la práctica.
    assert.deepEqual(Object.keys(permisosConfig(PERFIL)), ['permission']);
  });
});

describe('el MCP sale del perfil', () => {
  it('solo emite los servidores habilitados', () => {
    assert.deepEqual(
      Object.keys(mcpConfig(PERFIL).mcpServers).sort(),
      [...PERFIL.mcp.habilitados].sort(),
    );
  });

  it('un servidor declarado pero no habilitado no se emite', () => {
    const perfil = structuredClone(PERFIL);
    perfil.mcp.habilitados = ['context7'];
    assert.deepEqual(Object.keys(mcpConfig(perfil).mcpServers), ['context7']);
  });

  it('no reescribe la cadena de conexión: la interpolación de entorno pasa intacta', () => {
    // Resolverla aquí metería una credencial en un fichero versionado.
    const pg = JSON.stringify(mcpConfig(PERFIL).mcpServers.postgres);
    assert.ok(pg.includes('${DATABASE_URL'), pg);
  });
});

describe('lo generado es JSON válido y se anuncia como generado', () => {
  for (const [nombre, plantilla, cuerpo] of [
    ['rulesync', 'config/rulesync.jsonc.tmpl', () => rulesyncConfig(PERFIL, '0.1.0')],
    ['hooks', 'config/hooks.jsonc.tmpl', () => hooksConfig(PERFIL)],
    ['permisos', 'config/permissions.jsonc.tmpl', () => permisosConfig(PERFIL)],
    ['mcp', 'config/mcp.jsonc.tmpl', () => mcpConfig(PERFIL)],
  ]) {
    it(`«${nombre}» se parsea y avisa de que no se edita a mano`, () => {
      const salida = render(leerPlantilla(plantilla), {
        cuerpo: JSON.stringify(cuerpo(), null, 2),
        version: '0.1.0',
      });
      assert.match(salida, /GENERADO/);
      assert.match(salida, /no editar/i);
      // Se quitan los comentarios de línea para poder parsearlo como JSON estricto.
      assert.doesNotThrow(() => JSON.parse(salida.replace(/^\s*\/\/.*$/gm, '')));
    });
  }
});

// ── T-011 ────────────────────────────────────────────────────────────────────────────────────
describe('las plantillas de spec parametrizan los comandos del proyecto', () => {
  const CTX = {
    proyecto: PERFIL.proyecto,
    documentos: PERFIL.documentos,
    ejemplo_verificacion: PERFIL.roles.frontend.verificacion[0].cmd,
  };

  it('el comando de ejemplo de las tareas sale del perfil, no escrito a mano', () => {
    const salida = render(leerPlantilla('specs/tasks.md.tmpl'), CTX);
    assert.ok(salida.includes(CTX.ejemplo_verificacion), 'el DONE de ejemplo no viene del perfil');
  });

  it('cambiar el perfil cambia el comando de ejemplo', () => {
    // La mutación que importa: si estuviera escrito a mano, este caso pasaría igual.
    const otro = { ...CTX, ejemplo_verificacion: 'bazel test //...' };
    const salida = render(leerPlantilla('specs/tasks.md.tmpl'), otro);
    assert.ok(salida.includes('bazel test //...'));
    assert.ok(!salida.includes(CTX.ejemplo_verificacion));
  });

  it('las cuatro plantillas de spec existen y ninguna nombra un stack concreto', () => {
    for (const doc of ['spec', 'plan', 'tasks', 'CHANGELOG']) {
      const salida = render(leerPlantilla(`specs/${doc}.md.tmpl`), {
        ...CTX,
        ejemplo_verificacion: 'ZZCMD',
      });
      assert.doesNotMatch(salida, /pnpm|vitest|jest|nestjs|react|prisma/i, `${doc}.md.tmpl`);
    }
  });
});
