import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * AC-18 · La sintaxis de lo generado para Kiro es válida.
 *
 * Esto es lo **automatizable** de la verificación en Kiro, y es la mitad barata. La otra mitad
 * —que Kiro *lea* lo emitido y se comporte en consecuencia— está declarada NO automatizable en
 * AC-19 y vive en `docs/aceptacion-kiro.md` con su evidencia pegada. No se escribe aquí un test que
 * finja cubrirla: un test que simula una revisión manual es un verde falso permanente.
 *
 * Se ejecuta contra un proyecto ya generado:  SHOWI_PROYECTO=/ruta node --test test/kiro.test.mjs
 * Sin esa variable, los casos se saltan en vez de mentir.
 */

const PROYECTO = process.env.SHOWI_PROYECTO;
const hay = PROYECTO && existsSync(join(PROYECTO, '.kiro'));
const k = (...p) => join(PROYECTO, '.kiro', ...p);
const leer = (...p) => readFileSync(k(...p), 'utf8');

const TRIGGERS = new Set([
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop',
  'PostFileSave', 'PostFileCreate', 'PostFileDelete', 'PreTaskExec', 'PostTaskExec',
]);

describe('AC-18 · lo generado para Kiro es sintácticamente válido', { skip: !hay && 'sin SHOWI_PROYECTO generado' }, () => {
  it('cada steering con `fileMatch` declara su patrón', () => {
    // Sin `fileMatchPattern`, Kiro carga la regla **siempre** en vez de nunca: el filtro que la
    // hace útil desaparece y nadie lo nota, porque el fichero sigue estando.
    for (const f of readdirSync(k('steering'))) {
      const fm = leer('steering', f).match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue; // sin bloque = `always`, que es válido
      if (fm[1].includes('inclusion: fileMatch')) {
        assert.match(fm[1], /fileMatchPattern:/, `${f} filtra por fichero y no dice por cuáles`);
      }
      if (fm[1].includes('inclusion: auto')) {
        assert.match(fm[1], /name:/, f);
        assert.match(fm[1], /description:/, f);
      }
    }
  });

  it('los territorios no se solapan en su patrón principal', () => {
    // Si dos territorios cargaran con el mismo fichero, el paso 2 del guion manual no podría
    // distinguir «filtra» de «está siempre encendido».
    const patrones = readdirSync(k('steering'))
      .filter((f) => f.startsWith('20-territorio-'))
      .map((f) => [f, [...leer('steering', f).matchAll(/^ {2}- (\S+)/gm)].map((m) => m[1])]);
    assert.ok(patrones.length >= 2, 'hacen falta dos territorios para poder distinguirlos');
    const [, a] = patrones[0];
    const [, b] = patrones[1];
    assert.ok(a.some((p) => !b.includes(p)), 'los dos territorios cargan con los mismos ficheros');
  });

  it('el fichero de hooks es v1, con triggers válidos y activos', () => {
    const d = JSON.parse(leer('hooks', 'rulesync.json'));
    assert.equal(d.version, 'v1');
    assert.ok(d.hooks.length > 0, 'no hay ningún hook: no habría nada que medir');
    for (const h of d.hooks) {
      assert.ok(TRIGGERS.has(h.trigger), `trigger desconocido: ${h.trigger}`);
      assert.ok(['command', 'agent'].includes(h.action.type), h.name);
      assert.equal(h.enabled, true, `${h.name} está desactivado`);
    }
  });

  it('cada skill cumple el estándar: `name` igual al directorio', () => {
    // Es lo que hace abortar la generación entera de Kiro. `showi normaliza` lo absorbe antes,
    // así que este caso comprueba que el paso se dio.
    for (const dir of readdirSync(k('skills'))) {
      const f = k('skills', dir, 'SKILL.md');
      if (!existsSync(f)) continue;
      const declarado = readFileSync(f, 'utf8').match(/^name:[ \t]*(\S+)/m)?.[1];
      assert.equal(declarado, dir, `«${dir}» declara name: ${declarado}`);
    }
  });

  it('los subagentes llevan el modelo que la tabla del perfil les asigna', () => {
    // Que Kiro **honre** este campo es otra cosa, y es el paso 5 del guion manual (AC-20).
    for (const f of readdirSync(k('agents')).filter((x) => x.endsWith('.md'))) {
      assert.match(leer('agents', f), /^model: \S+$/m, `${f} no declara modelo`);
    }
  });

  it('Kiro tiene su raíz del método: la da AGENTS.md, no un fichero propio', () => {
    // Kiro no tiene fichero raíz en ámbito de proyecto; por eso `agentsmd` es un destino
    // obligatorio cuando `kiro-ide` está activo.
    const raiz = join(PROYECTO, 'AGENTS.md');
    assert.ok(existsSync(raiz), 'falta AGENTS.md: Kiro se quedaría sin la raíz del método');
    assert.match(readFileSync(raiz, 'utf8'), /spec-driven-development/);
  });

  it('los hooks que la configuración nombra existen de verdad', () => {
    // El cruce declarado × presente, en pequeño: un hook configurado que apunta a un script
    // ausente no falla, simplemente no mide nada. Y ese silencio se lee como un cero.
    for (const h of JSON.parse(leer('hooks', 'rulesync.json')).hooks) {
      const script = h.action.command.split(/\s+/).at(-1);
      assert.ok(existsSync(join(PROYECTO, script)), `${h.name} apunta a ${script}, que no existe`);
    }
  });
});
