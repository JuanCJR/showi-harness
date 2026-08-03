import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { render } from '../src/render.mjs';

// T-002 · El motor no evalúa código y no tiene condicionales.
//
// No es una restricción estética. Una plantilla que se evalúa como código convierte «el repositorio
// del método está comprometido» en «ejecución arbitraria en cada sync», y un motor con condicionales
// invita a escribir reglas en la plantilla — que es justo donde el método NO vive.

describe('nada se evalúa', () => {
  it('una expresión aritmética se emite literal', () => {
    assert.equal(render('{{1+1}}', {}), '{{1+1}}');
  });

  it('una llamada a función se emite literal', () => {
    assert.equal(render('{{process.exit()}}', {}), '{{process.exit()}}');
  });

  it('el contexto no da acceso a nada del entorno', () => {
    assert.equal(render('{{process.argv}}', {}), '');
    assert.equal(render('{{globalThis}}', {}), '');
  });

  it('un valor que resulta ser una función no se invoca ni se vuelca', () => {
    // Volcarla filtraría su código fuente en la documentación de seis herramientas.
    assert.equal(render('[{{f}}]', { f: () => 'ejecutada' }), '[]');
  });
});

describe('la cadena de prototipos no es contexto', () => {
  // Sin esto, una plantilla escrita por otro puede leer cosas que nadie puso en el contexto.
  it('no resuelve `constructor`', () => {
    assert.equal(render('[{{constructor}}]', {}), '[]');
  });

  it('no resuelve `__proto__` ni lo que cuelga de él', () => {
    assert.equal(render('[{{__proto__}}]', {}), '[]');
    assert.equal(render('[{{a.constructor.name}}]', { a: {} }), '[]');
  });

  it('no resuelve métodos heredados', () => {
    assert.equal(render('[{{toString}}]', {}), '[]');
    assert.equal(render('[{{hasOwnProperty}}]', {}), '[]');
  });

  it('sí resuelve una clave propia aunque se llame como una heredada', () => {
    assert.equal(render('[{{toString}}]', { toString: 'mío' }), '[mío]');
  });
});

describe('no hay condicionales', () => {
  it('una condición con argumento no se reconoce como bloque', () => {
    assert.equal(render('{{#if activo}}sí{{/if}}', { activo: true }), '{{#if activo}}sí{{/if}}');
  });

  it('un constructo que no se soporta se emite entero, no a medias', () => {
    // Lo que importa no es que `{{{x}}}` no funcione, sino que no funcione **a medias**: comerse
    // dos llaves y emitir `{x}` parece que funcionó. Un constructo no soportado tiene que verse.
    assert.equal(render('{{&crudo}}', { crudo: 'x' }), '{{&crudo}}');
    assert.equal(render('{{{crudo}}}', { crudo: 'x' }), '{{{crudo}}}');
  });
});
