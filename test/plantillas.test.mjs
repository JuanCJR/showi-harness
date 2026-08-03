import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { render } from '../src/render.mjs';

const RAIZ = new URL('../templates/roles/', import.meta.url).pathname;
const PLANTILLAS = readdirSync(RAIZ).filter((d) => statSync(join(RAIZ, d)).isDirectory());
const DE_ROL = PLANTILLAS.filter((d) => d !== '_comun');

const leer = (...t) => readFileSync(join(RAIZ, ...t), 'utf8');

describe('las plantillas existen', () => {
  it('hay al menos una plantilla de rol y el tronco común', () => {
    assert.ok(DE_ROL.length >= 1, `no hay plantillas de rol en ${RAIZ}`);
    assert.ok(PLANTILLAS.includes('_comun'), 'falta templates/roles/_comun/');
  });

  for (const plantilla of DE_ROL) {
    it(`«${plantilla}» tiene sus cuatro piezas`, () => {
      const hay = readdirSync(join(RAIZ, plantilla));
      for (const pieza of ['frontmatter.yml.tmpl', 'perfil.md.tmpl', 'portable.md', 'cierre.md.tmpl']) {
        assert.ok(hay.includes(pieza), `falta ${plantilla}/${pieza}`);
      }
    });
  }
});

// ── AC-5 ─────────────────────────────────────────────────────────────────────────────────────
describe('lo portable no lleva marcadores', () => {
  // Un marcador en la parte portable significa que el proyecto se coló en el método. Es la
  // comprobación que convierte el límite portable/perfil de comentario en algo que falla.
  it('el tronco común no tiene ninguno', () => {
    assert.doesNotMatch(leer('_comun', 'metodo.md'), /\{\{/);
  });

  for (const plantilla of DE_ROL) {
    it(`«${plantilla}/portable.md» no tiene ninguno`, () => {
      assert.doesNotMatch(leer(plantilla, 'portable.md'), /\{\{/);
    });
  }
});

// ── AC-6 ─────────────────────────────────────────────────────────────────────────────────────
describe('lo del perfil no lleva prosa de ningún proyecto', () => {
  // Palabras que solo pueden llegar por marcador. Si alguna sobrevive a un render con contexto
  // centinela, es que está escrita a mano en la plantilla.
  const PROYECTO = [
    'One Markdown', 'one-markdown', 'React', 'NestJS', 'Prisma', 'Zustand', 'Vitest', 'Jest',
    'Playwright', 'Tailwind', 'apps/web', 'apps/api', 'packages/shared', 'pnpm', 'IMPLEMENTATION',
  ];

  // Todo campo que alguna plantilla use tiene que estar aquí, **incluidos los opcionales**: si no
  // se rellenan, el render los deja vacíos y con ellos desaparece la prosa que los rodea.
  const CENTINELA = {
    nombre: 'ZZROL', descripcion: 'ZZDESC', dominio: 'ZZDOM', fronteras: 'ZZFRONT',
    stack: 'ZZSTACK', bloques_de_modelo: 'ZZMOD', registro_defectos: 'ZZREG',
    tests_minimos: 'ZZMIN',
    tests: [{ nivel: 'ZZNIV', ruta: 'ZZRUTA', nota: 'ZZNOTA' }],
    verificacion: [{ cmd: 'ZZCMD', que: 'ZZQUE' }],
    skills_stack: [{ nombre: 'ZZSKILL', cuando: 'ZZCUANDO' }],
    mcp: [{ nombre: 'ZZMCP', cuando: 'ZZCUANDO2' }],
    reglas_casa: ['ZZREGLA'],
    reporta_ademas: ['ZZEXTRA'],
    ejecutores: [{ nombre: 'ZZEJ', territorio: 'ZZTERR' }],
    documentos: {
      specs_dir: 'ZZSPECS', specs_patron: 'ZZPAT', plantillas_dir: 'ZZPLAN',
      indice: 'ZZIND', seguimiento: 'ZZSEG', regla_seguimiento: 'ZZRS',
    },
  };

  for (const plantilla of DE_ROL) {
    for (const pieza of ['frontmatter.yml.tmpl', 'perfil.md.tmpl', 'cierre.md.tmpl']) {
      it(`«${plantilla}/${pieza}» renderizado en blanco no nombra ningún proyecto`, () => {
        const salida = render(leer(plantilla, pieza), CENTINELA);
        for (const palabra of PROYECTO) {
          assert.ok(
            !salida.toLowerCase().includes(palabra.toLowerCase()),
            `«${palabra}» está escrito a mano en ${plantilla}/${pieza}`,
          );
        }
      });
    }
  }

  /**
   * Resuelve un marcador **dentro de su bloque**: `{{nivel}}` no es una raíz del contexto, es un
   * campo de los elementos de `{{#tests}}`. Sin esta distinción el guardián da falsos positivos y
   * se acaba desactivando, que es cómo mueren los guardianes.
   */
  function sinCubrir(texto) {
    const sinComentarios = texto.replace(/\{\{!--[\s\S]*?--\}\}/g, '');
    const huerfanos = [];
    const pila = [CENTINELA];

    for (const [, tipo, ruta] of sinComentarios.matchAll(/\{\{([#^/]?)\s*([\w.]+|\.)\s*\}\}/g)) {
      const ctx = pila.at(-1);
      if (tipo === '/') {
        pila.pop();
        continue;
      }
      const valor = ruta === '.' ? ctx : ruta.split('.').reduce((o, k) => o?.[k], ctx);
      if (tipo === '#' || tipo === '^') {
        // Mismo alcance que `ampliar()` en el motor: el elemento **añade** sus campos al contexto
        // de fuera, no lo sustituye. Modelarlo distinto aquí daría falsos positivos, y un guardián
        // que da falsos positivos acaba desactivado.
        const item = Array.isArray(valor) ? valor[0] : valor;
        pila.push(item !== null && typeof item === 'object' ? { ...ctx, ...item } : { ...ctx });
      }
      if (valor === undefined) huerfanos.push(ruta);
    }
    return huerfanos;
  }

  for (const plantilla of DE_ROL) {
    for (const pieza of ['frontmatter.yml.tmpl', 'perfil.md.tmpl', 'cierre.md.tmpl']) {
      it(`el centinela cubre todos los marcadores de «${plantilla}/${pieza}»`, () => {
        // Sin esto, la comprobación de arriba pasaría **por no haber renderizado nada**: un
        // marcador que el centinela no cubre sale vacío y se lleva la prosa que lo rodea.
        assert.deepEqual(sinCubrir(leer(plantilla, pieza)), []);
      });
    }
  }
});
