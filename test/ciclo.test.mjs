import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { actualizar, iniciar } from '../src/ciclo.mjs';
import { comprobar, sincronizar } from '../src/cli.mjs';

/**
 * Estos dos comandos son **la tesis del repositorio**. Todo lo demás sirve para llevar el método a
 * un proyecto una vez; `update` es lo que hace que una mejora llegue a los proyectos que **ya lo
 * instalaron**, que es el fallo por el que existe todo esto: una copia manual diverge desde el día
 * uno y no recibe nunca una corrección.
 *
 * Y lo que hace que `update` sea usable no es que actualice: es que **no se lleve nada por
 * delante**. Un proyecto maduro tiene en su perfil y en su registro de defectos lo más caro de
 * reconstruir que tiene.
 */

const FIXTURE = new URL('./fixtures/one-markdown/showi.yml', import.meta.url).pathname;
const hash = (t) => createHash('sha1').update(t).digest('hex');

const proyectoCon = (version = '0.1.0') => {
  const d = mkdtempSync(join(tmpdir(), 'showi-ciclo-'));
  writeFileSync(
    join(d, 'showi.yml'),
    readFileSync(FIXTURE, 'utf8').replace(/^  metodo: ".*"$/m, `  metodo: "${version}"`),
  );
  mkdirSync(join(d, 'docs/harness'), { recursive: true });
  writeFileSync(join(d, 'docs/harness/defectos.md'), '# Doce defectos medidos en siete specs\n');
  sincronizar(d, { silencioso: true });
  return d;
};

describe('init · instalar en un repositorio vacío (AC-15)', () => {
  it('deja un perfil válido y un árbol sincronizado', () => {
    const d = mkdtempSync(join(tmpdir(), 'showi-init-'));
    const { creados } = iniciar(d, { nombre: 'Proyecto Nuevo', slug: 'proyecto-nuevo' });
    assert.ok(creados.includes('showi.yml'));
    assert.ok(existsSync(join(d, '.rulesync/subagents')), 'no sincronizó');
    assert.deepEqual(comprobar(d).problemas, [], 'lo que init deja no pasa su propio check');
    rmSync(d, { recursive: true, force: true });
  });

  it('el perfil que crea usa los datos que se le dan, no los del proyecto de referencia', () => {
    const d = mkdtempSync(join(tmpdir(), 'showi-init2-'));
    iniciar(d, { nombre: 'Otro', slug: 'otro' });
    const perfil = readFileSync(join(d, 'showi.yml'), 'utf8');
    assert.match(perfil, /slug: otro/);
    assert.doesNotMatch(perfil, /one-markdown|React|NestJS/, 'se coló el proyecto de referencia');
    rmSync(d, { recursive: true, force: true });
  });

  it('el registro de defectos nace vacío, no copiado', () => {
    // Los defectos de otro proyecto no son los tuyos, y una regla con la historia equivocada se
    // obedece peor que una sin historia.
    const d = mkdtempSync(join(tmpdir(), 'showi-init3-'));
    iniciar(d, { nombre: 'Otro', slug: 'otro' });
    const reg = join(d, 'docs/harness/defectos.md');
    if (existsSync(reg)) {
      const texto = readFileSync(reg, 'utf8');
      assert.ok(texto.length < 2000, 'el registro nace con contenido de otro proyecto');
      assert.doesNotMatch(texto, /19,73|7\.085/, 'copió defectos ajenos');
    }
    rmSync(d, { recursive: true, force: true });
  });

  it('se niega a sobreescribir un perfil que ya existe', () => {
    const d = proyectoCon();
    assert.throws(() => iniciar(d, { nombre: 'X', slug: 'x' }), /showi\.yml/);
    rmSync(d, { recursive: true, force: true });
  });
});

describe('update · AC-16 · no toca lo que es del proyecto', () => {
  it('sube la versión del método y **nada más** del perfil', () => {
    const d = proyectoCon('0.1.0');
    const antes = readFileSync(join(d, 'showi.yml'), 'utf8');
    actualizar(d, '0.2.0', { silencioso: true });
    const despues = readFileSync(join(d, 'showi.yml'), 'utf8');

    assert.match(despues, /metodo: "0\.2\.0"/);
    // La única diferencia admisible es esa línea. Se comprueba comparando todo lo demás.
    assert.equal(
      hash(despues.replace(/^  metodo: ".*"$/m, 'X')),
      hash(antes.replace(/^  metodo: ".*"$/m, 'X')),
      'update tocó algo más del perfil',
    );
    rmSync(d, { recursive: true, force: true });
  });

  it('no toca el registro de defectos', () => {
    // Sin esto, el primer `update` se llevaría lo más caro de reconstruir que tiene un proyecto
    // maduro. Es la razón de que el registro viva fuera de los ficheros generados.
    const d = proyectoCon();
    const reg = join(d, 'docs/harness/defectos.md');
    const antes = hash(readFileSync(reg, 'utf8'));
    actualizar(d, '0.2.0', { silencioso: true });
    assert.equal(hash(readFileSync(reg, 'utf8')), antes);
    rmSync(d, { recursive: true, force: true });
  });

  it('deja el árbol regenerado y sin deriva', () => {
    const d = proyectoCon();
    actualizar(d, '0.2.0', { silencioso: true });
    assert.deepEqual(comprobar(d).problemas, []);
    rmSync(d, { recursive: true, force: true });
  });
});

describe('update · AC-17 · para si el generado ya estaba divergido', () => {
  it('se niega a escribir y nombra el fichero', () => {
    // El contrato de parada aplicado a la propia herramienta: sobreescribir un cambio local que
    // nadie recuerda haber hecho es peor que no actualizar.
    const d = proyectoCon();
    const tocado = join(d, '.rulesync/subagents/frontend.md');
    writeFileSync(tocado, `${readFileSync(tocado, 'utf8')}\ncambio a mano\n`);

    assert.throws(() => actualizar(d, '0.2.0', { silencioso: true }), /frontend\.md/);
    // Y no ha escrito: la versión del perfil sigue siendo la de antes.
    assert.match(readFileSync(join(d, 'showi.yml'), 'utf8'), /metodo: "0\.1\.0"/);
    rmSync(d, { recursive: true, force: true });
  });

  it('con `--forzar` sí actualiza, pero hay que pedirlo', () => {
    const d = proyectoCon();
    const tocado = join(d, '.rulesync/subagents/frontend.md');
    writeFileSync(tocado, `${readFileSync(tocado, 'utf8')}\ncambio a mano\n`);
    actualizar(d, '0.2.0', { forzar: true, silencioso: true });
    assert.match(readFileSync(join(d, 'showi.yml'), 'utf8'), /metodo: "0\.2\.0"/);
    rmSync(d, { recursive: true, force: true });
  });

  it('no hace nada si ya está en la versión pedida', () => {
    const d = proyectoCon('0.1.0');
    const r = actualizar(d, '0.1.0', { silencioso: true });
    assert.equal(r.aplicado, false);
    rmSync(d, { recursive: true, force: true });
  });
});
