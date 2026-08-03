import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { diagnosticar } from '../src/doctor.mjs';
import { sincronizar } from '../src/cli.mjs';

/**
 * `doctor` existe porque **una skill o un servidor apagado no se puede invocar aunque un rol lo
 * declare obligatorio**, y ese cruce no lo hacía nadie. En este proyecto dejó tres skills muertas
 * durante siete specs sin que nada avisara.
 *
 * Los cuatro casos que ya ocurrieron de verdad y que este comando tiene que cazar:
 *   · una skill declarada obligatoria que **no existe** (`find-docs`, siete specs)
 *   · un MCP declarado obligatorio y **apagado** en la configuración local
 *   · una herramienta **sin selección de modelo** — degradada, que no es rota
 *   · instrumentación **no medida**, que no es lo mismo que cero
 */

const FIXTURE = new URL('./fixtures/one-markdown/showi.yml', import.meta.url).pathname;
let proyecto;

const METODO = [
  'spec-driven-development', 'test-driven-development-tdd', 'stop-and-report',
  'verification-and-measurement',
];
const RUTAS = ['.claude', '.cursor', '.github', '.opencode', '.kiro', '.agents'];

/**
 * Monta un proyecto con el árbol que dejaría `rulesync generate`. Se simula **solo el reparto de
 * ficheros**, que es lo que `doctor` inspecciona; lo que no se simula es que rulesync funcione —eso
 * lo prueba `test/instalacion.sh` contra el remoto de verdad—.
 */
const rehacer = (mutar, skillsExtra = []) => {
  const d = mkdtempSync(join(tmpdir(), 'showi-doc-'));
  let perfil = readFileSync(FIXTURE, 'utf8');
  if (mutar) perfil = mutar(perfil);
  writeFileSync(join(d, 'showi.yml'), perfil);
  sincronizar(d, { silencioso: true });

  const declaradas = [...perfil.matchAll(/nombre: ([a-z0-9-]+), cuando:/g)].map((m) => m[1]);
  for (const ruta of RUTAS) {
    for (const s of [...METODO, ...declaradas, ...skillsExtra]) {
      mkdirSync(join(d, ruta, 'skills', s), { recursive: true });
      writeFileSync(
        join(d, ruta, 'skills', s, 'SKILL.md'),
        `---\nname: ${s}\ndescription: x\n---\n\ncuerpo de ${s}\n`,
      );
    }
  }
  return d;
};

const textos = (informe, titulo) =>
  informe.secciones.find((s) => s.titulo.includes(titulo))?.hallazgos.map((h) => h.texto) ?? [];
const niveles = (informe) => informe.secciones.flatMap((s) => s.hallazgos.map((h) => h.nivel));

before(() => {
  proyecto = rehacer();
});

describe('el método', () => {
  it('confirma que las cuatro skills están y con el mismo cuerpo', () => {
    const d = diagnosticar(proyecto);
    assert.ok(textos(d, 'MÉTODO').some((t) => /4\/4/.test(t)), JSON.stringify(textos(d, 'MÉTODO')));
  });

  it('avisa si el tag que el perfil pide no está en el lockfile', () => {
    // Es el 422 que costó una vuelta: el perfil pedía un tag que nunca se empujó, y el error de
    // rulesync —«no commit found for SHA»— parece que el origen no existe.
    const d = diagnosticar(proyecto);
    assert.ok(
      textos(d, 'MÉTODO').some((t) => /lockfile|instalado|sin instalar/i.test(t)),
      'no dice nada sobre si el método declarado es el instalado',
    );
  });
});

describe('solo se mira lo que el proyecto ha activado', () => {
  it('no reporta como ausentes las rutas de herramientas que no se usan', () => {
    // Lo encontró el primer proyecto ajeno: activaba tres destinos y `doctor` decía «0/4 skills
    // completas» porque comprobaba los seis. Un error por algo que se decidió no usar es un falso
    // positivo, y los falsos positivos matan a los guardianes: se aprende a ignorarlos.
    const proy = rehacer((p) =>
      p.replace(/^  activas: \[.*$/m, '  activas: [claudecode, agentsmd, agentsskills]'),
    );
    for (const r of ['.cursor', '.github', '.opencode', '.kiro']) {
      rmSync(join(proy, r), { recursive: true, force: true });
    }
    const d = diagnosticar(proy);
    const errores = d.secciones
      .find((s) => s.titulo.includes('MÉTODO'))
      .hallazgos.filter((h) => h.nivel === 'error');
    assert.deepEqual(errores, [], JSON.stringify(errores));
    rmSync(proy, { recursive: true, force: true });
  });
});

describe('skills declaradas × presentes', () => {
  it('caza una skill que un rol declara obligatoria y no existe', () => {
    // Exactamente `find-docs`: declarada en dos roles durante siete specs, inexistente.
    // Se declara `find-docs` en el perfil y **no** se crea el directorio: es el estado exacto que
    // sobrevivió siete specs sin que nada avisara.
    const proy = rehacer((p) =>
      p.replace(
        '      - { nombre: playwright, cuando:',
        '      - { nombre: find-docs, cuando: "inventada" }\n      - { nombre: playwright, cuando:',
      ),
    );
    rmSync(join(proy, '.claude/skills/find-docs'), { recursive: true, force: true });
    for (const r of ['.cursor', '.github', '.opencode', '.kiro', '.agents']) {
      rmSync(join(proy, r, 'skills/find-docs'), { recursive: true, force: true });
    }
    const d = diagnosticar(proy);
    const hallazgos = textos(d, 'SKILLS');
    assert.ok(hallazgos.some((t) => t.includes('find-docs')), JSON.stringify(hallazgos));
    assert.ok(niveles(d).includes('error'));
  });

  it('no se queja de las que sí existen', () => {
    assert.ok(!textos(diagnosticar(proyecto), 'SKILLS').some((t) => /zustand/.test(t)));
  });
});

describe('MCP declarado × habilitado', () => {
  it('caza un servidor que un rol declara obligatorio y está apagado', () => {
    // El defecto que dejó tres skills muertas: declarado en el agente, apagado en la configuración.
    const d = diagnosticar(rehacer((p) => p.replace('  habilitados: [context7, playwright, coderag, postgres]', '  habilitados: [playwright]')));
    const hallazgos = textos(d, 'MCP');
    assert.ok(hallazgos.some((t) => t.includes('context7')), JSON.stringify(hallazgos));
  });

  it('avisa además de los apagados por configuración local, que ganan', () => {
    const d = mkdtempSync(join(tmpdir(), 'showi-loc-'));
    cpSync(FIXTURE, join(d, 'showi.yml'));
    sincronizar(d, { silencioso: true });
    mkdirSync(join(d, '.claude'), { recursive: true });
    writeFileSync(
      join(d, '.claude/settings.local.json'),
      JSON.stringify({ disabledMcpjsonServers: ['context7', 'coderag'] }),
    );
    const hallazgos = textos(diagnosticar(d), 'MCP');
    assert.ok(
      hallazgos.some((t) => /local/i.test(t) && t.includes('context7')),
      JSON.stringify(hallazgos),
    );
    rmSync(d, { recursive: true, force: true });
  });
});

describe('modelos', () => {
  it('lista qué modelo lleva cada rol en cada herramienta', () => {
    assert.ok(textos(diagnosticar(proyecto), 'MODELOS').some((t) => /frontend/.test(t)));
  });

  it('las herramientas sin selección de modelo salen como degradadas, no como rotas', () => {
    // Copilot y —verificado en Kiro— `kiro-ide`. Degradado es una limitación de la herramienta;
    // llamarlo error haría que se ignorasen los errores de verdad.
    const d = diagnosticar(proyecto);
    const deg = textos(d, 'MODELOS').filter((t) => /degradad/i.test(t));
    assert.ok(deg.some((t) => t.includes('copilot')), JSON.stringify(textos(d, 'MODELOS')));
    for (const s of d.secciones.filter((x) => x.titulo.includes('MODELOS'))) {
      for (const h of s.hallazgos.filter((x) => /degradad/i.test(x.texto))) {
        assert.notEqual(h.nivel, 'error', 'degradado no es un error');
      }
    }
  });
});

describe('instrumentación', () => {
  it('«no medido» y «cero» no se dicen igual', () => {
    // LA distinción de este comando. Un cero de un instrumento desconectado costó dos
    // conclusiones falsas en la retrospectiva anterior.
    const hallazgos = textos(diagnosticar(proyecto), 'INSTRUMENTACIÓN');
    assert.ok(
      hallazgos.some((t) => /no medid|sin datos/i.test(t)),
      `sin registros debe decir «no medido», no 0: ${JSON.stringify(hallazgos)}`,
    );
    assert.ok(!hallazgos.some((t) => /\b0 (skills|escrituras)\b/.test(t)), 'dijo cero sin medir');
  });

  it('cuando hay datos, los cuenta', () => {
    const d = rehacer();
    mkdirSync(join(d, '.harness'), { recursive: true });
    writeFileSync(
      join(d, '.harness/skill-usage.jsonl'),
      '{"skill":"tdd","_esquema":"claudecode"}\n{"skill":"tdd","_esquema":"claudecode"}\n',
    );
    assert.ok(textos(diagnosticar(d), 'INSTRUMENTACIÓN').some((t) => /\b2\b/.test(t)));
    rmSync(d, { recursive: true, force: true });
  });

  it('reporta las líneas con esquema desconocido, que son la sonda', () => {
    const d = rehacer();
    mkdirSync(join(d, '.harness'), { recursive: true });
    writeFileSync(
      join(d, '.harness/delegation.jsonl'),
      '{"agent":null,"_esquema":"desconocido","_claves":["a","b"]}\n',
    );
    assert.ok(textos(diagnosticar(d), 'INSTRUMENTACIÓN').some((t) => /desconocid/i.test(t)));
    rmSync(d, { recursive: true, force: true });
  });
});
