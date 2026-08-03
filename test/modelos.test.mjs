import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bloquesDeModelo } from '../src/roles.mjs';

// AC-8 y AC-9. La tabla `modelos` de showi.yml es la única razón de ser de este módulo: es lo que
// permite decidir bajo qué LLM trabaja cada rol **en cada herramienta**, que es la parte del
// problema que ningún estándar resuelve porque cada herramienta tiene su propio espacio de nombres.

const MODELOS = {
  defecto: {
    claudecode: { model: 'sonnet' },
    cursor: { model: 'auto' },
    opencode: { model: 'anthropic/claude-sonnet-4-5' },
    copilot: {}, // Copilot no tiene selección de modelo por subagente
  },
  orchestrator: {
    claudecode: { model: 'opus', effort: 'high' },
    cursor: { model: 'opus', readonly: false },
    opencode: { mode: 'primary', model: 'anthropic/claude-opus-4-5', temperature: 0.2 },
    copilot: {},
  },
};

const ACTIVAS = ['claudecode', 'cursor', 'opencode', 'copilot'];

describe('AC-8 · cada herramienta recibe el modelo que le asigna la tabla', () => {
  it('emite un bloque por herramienta activa que tenga configuración', () => {
    const yaml = bloquesDeModelo('orchestrator', MODELOS, ACTIVAS);
    assert.match(yaml, /^claudecode:$/m);
    assert.match(yaml, /^ {2}model: opus$/m);
    assert.match(yaml, /^ {2}effort: high$/m);
    assert.match(yaml, /^opencode:$/m);
    assert.match(yaml, /^ {2}model: anthropic\/claude-opus-4-5$/m);
  });

  it('respeta los tipos: los booleanos y los números no salen entrecomillados', () => {
    const yaml = bloquesDeModelo('orchestrator', MODELOS, ACTIVAS);
    assert.match(yaml, /^ {2}readonly: false$/m);
    assert.match(yaml, /^ {2}temperature: 0\.2$/m);
  });

  it('un rol sin entrada propia hereda el bloque por defecto', () => {
    const yaml = bloquesDeModelo('frontend', MODELOS, ACTIVAS);
    assert.match(yaml, /^ {2}model: sonnet$/m);
    assert.doesNotMatch(yaml, /opus/);
  });

  it('no emite herramientas que no estén activas', () => {
    const yaml = bloquesDeModelo('orchestrator', MODELOS, ['claudecode']);
    assert.match(yaml, /^claudecode:$/m);
    assert.doesNotMatch(yaml, /^cursor:$/m);
    assert.doesNotMatch(yaml, /^opencode:$/m);
  });
});

describe('AC-9 · a una herramienta sin selección de modelo no se le inventa el campo', () => {
  it('un bloque vacío no emite nada, ni siquiera la clave', () => {
    // Escribir `model:` «por si acaso» es peor que no escribirlo: la herramienta lo ignora en
    // silencio y quien lee la configuración cree que la elección se aplicó.
    const yaml = bloquesDeModelo('orchestrator', MODELOS, ACTIVAS);
    assert.doesNotMatch(yaml, /^copilot:/m);
  });

  it('lo declara degradado para que alguien pueda contarlo', () => {
    const { degradadas } = bloquesDeModelo.detalle('orchestrator', MODELOS, ACTIVAS);
    assert.deepEqual(degradadas, ['copilot']);
  });
});

describe('el YAML emitido es válido y estable', () => {
  it('no deja el frontmatter sin cerrar ni mete líneas en blanco sueltas', () => {
    const yaml = bloquesDeModelo('orchestrator', MODELOS, ACTIVAS);
    assert.ok(yaml.endsWith('\n'), 'debe terminar en salto de línea para pegar antes del cierre');
    assert.doesNotMatch(yaml, /\n\n/);
  });

  it('es determinista: el mismo perfil da el mismo texto', () => {
    const a = bloquesDeModelo('orchestrator', MODELOS, ACTIVAS);
    const b = bloquesDeModelo('orchestrator', MODELOS, ACTIVAS);
    assert.equal(a, b);
  });

  it('el orden lo manda la lista de herramientas activas, no el de la tabla', () => {
    const yaml = bloquesDeModelo('orchestrator', MODELOS, ['opencode', 'claudecode']);
    assert.ok(yaml.indexOf('opencode:') < yaml.indexOf('claudecode:'));
  });

  it('una cadena que YAML leería como otra cosa se entrecomilla', () => {
    const modelos = { defecto: { kiro: { model: 'yes', nota: '3.10' } } };
    const yaml = bloquesDeModelo('x', modelos, ['kiro']);
    assert.match(yaml, /^ {2}model: "yes"$/m);
    assert.match(yaml, /^ {2}nota: "3\.10"$/m);
  });
});
