import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { render } from '../src/render.mjs';

// Un caso por constructo. La lista de constructos es la de `plan.md` D2, y es cerrada a
// propósito: el motor no tiene condicionales ni expresiones, y T-002 lo hace exigible.

describe('interpolación', () => {
  it('sustituye un valor plano', () => {
    assert.equal(render('Hola {{nombre}}.', { nombre: 'Ada' }), 'Hola Ada.');
  });

  it('resuelve una ruta con puntos', () => {
    assert.equal(
      render('{{proyecto.slug}}', { proyecto: { slug: 'one-markdown' } }),
      'one-markdown',
    );
  });

  it('tolera espacios dentro de las llaves', () => {
    assert.equal(render('{{  nombre  }}', { nombre: 'Ada' }), 'Ada');
  });

  it('emite cadena vacía cuando la ruta no existe', () => {
    // Deliberado: una plantilla a la que le falta un dato produce un hueco visible, no un
    // "undefined" incrustado en la documentación de seis herramientas.
    assert.equal(render('[{{no.existe}}]', {}), '[]');
  });

  it('no escapa nada: la salida es markdown, no HTML', () => {
    assert.equal(render('{{x}}', { x: '<b>&"' }), '<b>&"');
  });
});

describe('iteración', () => {
  it('repite el bloque por cada elemento y expone sus campos', () => {
    const salida = render('{{#roles}}- {{nombre}}\n{{/roles}}', {
      roles: [{ nombre: 'frontend' }, { nombre: 'backend' }],
    });
    assert.equal(salida, '- frontend\n- backend\n');
  });

  it('expone el elemento entero como punto cuando la lista es de escalares', () => {
    assert.equal(render('{{#xs}}[{{.}}]{{/xs}}', { xs: ['a', 'b'] }), '[a][b]');
  });

  it('ve el contexto de fuera desde dentro del bloque', () => {
    const salida = render('{{#xs}}{{proyecto}}/{{.}} {{/xs}}', {
      proyecto: 'web',
      xs: ['a', 'b'],
    });
    assert.equal(salida, 'web/a web/b ');
  });

  it('no emite nada si la lista está vacía', () => {
    assert.equal(render('a{{#xs}}NO{{/xs}}b', { xs: [] }), 'ab');
  });
});

describe('bloque invertido', () => {
  it('emite cuando la lista está vacía', () => {
    assert.equal(render('{{^xs}}ninguno{{/xs}}', { xs: [] }), 'ninguno');
  });

  it('emite cuando la clave no existe', () => {
    assert.equal(render('{{^xs}}ninguno{{/xs}}', {}), 'ninguno');
  });

  it('no emite cuando la lista tiene elementos', () => {
    assert.equal(render('{{^xs}}ninguno{{/xs}}', { xs: ['a'] }), '');
  });
});

describe('parciales', () => {
  it('incluye el parcial literal, sin renderizarlo dos veces', () => {
    // El parcial se resuelve por callback y no por acceso a disco: el motor no toca el sistema
    // de ficheros, así que se puede probar entero sin fixtures.
    const salida = render('A{{>trozo}}B', {}, { parcial: (n) => `<${n}>` });
    assert.equal(salida, 'A<trozo>B');
  });

  it('falla nombrando el parcial cuando no hay forma de resolverlo', () => {
    assert.throws(() => render('{{>trozo}}', {}), /trozo/);
  });
});

describe('comentarios', () => {
  it('no emite el comentario', () => {
    assert.equal(render('a{{!-- nota para quien edite --}}b', {}), 'ab');
  });

  it('no interpola dentro del comentario', () => {
    assert.equal(render('a{{!-- {{secreto}} --}}b', { secreto: 'X' }), 'ab');
  });
});
