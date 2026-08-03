import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validar } from '../src/esquema.mjs';

/**
 * Un perfil mínimo válido. Deliberadamente corto: la spec deja abierta la forma exacta de
 * `showi.yml` hasta el primer render en verde, así que aquí solo entran las decisiones **cerradas**
 * —qué proyecto es, qué roles hay y a qué herramientas se emite—, no el detalle de cada rol.
 */
const VALIDO = {
  showi: { esquema: 1, metodo: '0.1.0' },
  proyecto: { nombre: 'One Markdown', slug: 'one-markdown' },
  roles: {
    frontend: { plantilla: 'implementador', descripcion: 'Especialista en el frontend.' },
  },
  herramientas: { activas: ['claudecode', 'kiro-ide'] },
};

const sin = (ruta) => {
  const copia = structuredClone(VALIDO);
  const pasos = ruta.split('.');
  let actual = copia;
  for (const paso of pasos.slice(0, -1)) actual = actual[paso];
  delete actual[pasos.at(-1)];
  return copia;
};

describe('un perfil completo no da problemas', () => {
  it('no devuelve ninguno', () => {
    assert.deepEqual(validar(VALIDO), []);
  });
});

describe('el error nombra el campo que falta', () => {
  // La propiedad que importa no es «falla», es «dice cuál». Un validador que responde
  // "perfil inválido" obliga a adivinar, y adivinar es lo que este método existe para evitar.
  for (const ruta of ['showi.metodo', 'proyecto.slug', 'herramientas.activas']) {
    it(`nombra «${ruta}»`, () => {
      const problemas = validar(sin(ruta));
      assert.equal(problemas.length, 1);
      assert.equal(problemas[0].ruta, ruta);
      assert.match(problemas[0].problema, /falta|obligatorio/i);
    });
  }

  it('nombra la ruta completa dentro de un rol, con el rol dentro', () => {
    const perfil = structuredClone(VALIDO);
    delete perfil.roles.frontend.plantilla;
    const problemas = validar(perfil);
    assert.equal(problemas.length, 1);
    assert.equal(problemas[0].ruta, 'roles.frontend.plantilla');
  });
});

describe('el error nombra el tipo cuando no cuadra', () => {
  it('dice qué se esperaba y qué llegó', () => {
    const perfil = structuredClone(VALIDO);
    perfil.herramientas.activas = 'claudecode';
    const problemas = validar(perfil);
    assert.equal(problemas.length, 1);
    assert.equal(problemas[0].ruta, 'herramientas.activas');
    assert.match(problemas[0].problema, /array/);
    assert.match(problemas[0].problema, /string/);
  });

  it('comprueba también el tipo de los elementos de una lista', () => {
    const perfil = structuredClone(VALIDO);
    perfil.herramientas.activas = ['claudecode', 7];
    const problemas = validar(perfil);
    assert.equal(problemas.length, 1);
    assert.equal(problemas[0].ruta, 'herramientas.activas.1');
  });
});

describe('los problemas se recogen todos', () => {
  it('no para en el primero', () => {
    // Arreglar de uno en uno, reejecutando entre cada uno, es la forma más cara de
    // rellenar un fichero de configuración.
    const perfil = structuredClone(VALIDO);
    delete perfil.proyecto.slug;
    delete perfil.herramientas.activas;
    delete perfil.roles.frontend.descripcion;
    const rutas = validar(perfil)
      .map((p) => p.ruta)
      .sort();
    assert.deepEqual(rutas, ['herramientas.activas', 'proyecto.slug', 'roles.frontend.descripcion']);
  });
});

describe('el validador no finge cubrir lo que no entiende', () => {
  it('estalla ante una palabra de esquema que no implementa', () => {
    // Ésta es la propiedad más importante del archivo. Un validador que ignora en silencio
    // lo que no sabe leer produce un esquema que **parece** estricto y no valida nada: el
    // verde falso exacto que este método persigue.
    const esquemaRaro = {
      type: 'object',
      properties: { x: { type: 'string', pattern: '^a' } },
    };
    assert.throws(() => validar({ x: 'b' }, esquemaRaro), /pattern/);
  });

  it('acepta las palabras que sí implementa', () => {
    const esquemaSimple = {
      type: 'object',
      required: ['x'],
      properties: { x: { type: 'string' } },
    };
    assert.deepEqual(validar({ x: 'a' }, esquemaSimple), []);
    assert.equal(validar({}, esquemaSimple)[0].ruta, 'x');
  });
});
