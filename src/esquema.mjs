import { readFileSync } from 'node:fs';

/**
 * Validación del perfil contra `schema/showi.schema.json`.
 *
 * El esquema es **una sola fuente**: el mismo fichero da el autocompletado en el editor y gobierna
 * esta validación. Dos definiciones de la misma forma divergen; ésta es la misma regla que la del
 * método aplicada a su propia configuración.
 *
 * Se implementa un subconjunto de JSON Schema, y **cualquier palabra fuera de él es un error, no
 * algo que se ignora**. Un validador que salta en silencio lo que no sabe leer produce un esquema
 * que parece estricto y no valida nada — que es el verde falso que este método persigue.
 */

const IGNORADAS = new Set(['$schema', '$id', 'title', 'description', 'examples', 'default']);
const SOPORTADAS = new Set([
  'type',
  'required',
  'properties',
  'additionalProperties',
  'items',
  'enum',
  'minItems',
]);

let porDefecto;

/**
 * @param {unknown} perfil
 * @param {object} [esquema] por defecto, `schema/showi.schema.json`
 * @returns {Array<{ruta: string, problema: string}>} vacío si no hay problemas
 */
export function validar(perfil, esquema = esquemaPorDefecto()) {
  const problemas = [];
  comprobar(perfil, esquema, '', problemas);
  return problemas;
}

function esquemaPorDefecto() {
  porDefecto ??= JSON.parse(
    readFileSync(new URL('../schema/showi.schema.json', import.meta.url), 'utf8'),
  );
  return porDefecto;
}

function comprobar(valor, esquema, ruta, problemas) {
  vigilarPalabras(esquema, ruta);

  if (esquema.type && !esDeTipo(valor, esquema.type)) {
    problemas.push({ ruta, problema: `se esperaba ${esquema.type} y llegó ${tipoDe(valor)}` });
    return; // sin el tipo correcto, todo lo de dentro sería ruido derivado
  }

  if (esquema.enum && !esquema.enum.includes(valor)) {
    problemas.push({ ruta, problema: `debe ser uno de: ${esquema.enum.join(', ')}` });
  }

  if (esquema.type === 'object') comprobarObjeto(valor, esquema, ruta, problemas);
  if (esquema.type === 'array') comprobarLista(valor, esquema, ruta, problemas);
}

function comprobarObjeto(valor, esquema, ruta, problemas) {
  for (const clave of esquema.required ?? []) {
    if (!Object.hasOwn(valor, clave)) {
      problemas.push({ ruta: bajo(ruta, clave), problema: 'falta y es obligatorio' });
    }
  }

  for (const [clave, sub] of Object.entries(esquema.properties ?? {})) {
    if (Object.hasOwn(valor, clave)) comprobar(valor[clave], sub, bajo(ruta, clave), problemas);
  }

  const extra = esquema.additionalProperties;
  if (extra && typeof extra === 'object') {
    // Claves libres con forma fija: es el caso de `roles`, donde la clave es el nombre del rol.
    for (const [clave, sub] of Object.entries(valor)) {
      if (!Object.hasOwn(esquema.properties ?? {}, clave)) {
        comprobar(sub, extra, bajo(ruta, clave), problemas);
      }
    }
  } else if (extra === false) {
    for (const clave of Object.keys(valor)) {
      if (!Object.hasOwn(esquema.properties ?? {}, clave)) {
        problemas.push({ ruta: bajo(ruta, clave), problema: 'no se reconoce' });
      }
    }
  }
}

function comprobarLista(valor, esquema, ruta, problemas) {
  if (esquema.minItems !== undefined && valor.length < esquema.minItems) {
    problemas.push({ ruta, problema: `necesita al menos ${esquema.minItems} elemento(s)` });
  }
  if (esquema.items) {
    valor.forEach((item, i) => comprobar(item, esquema.items, bajo(ruta, String(i)), problemas));
  }
}

/** Lo que no se sabe leer se dice, no se salta. */
function vigilarPalabras(esquema, ruta) {
  for (const palabra of Object.keys(esquema)) {
    if (!SOPORTADAS.has(palabra) && !IGNORADAS.has(palabra)) {
      throw new Error(
        `El esquema usa «${palabra}»${ruta ? ` en «${ruta}»` : ''} y el validador no la implementa. ` +
          `Impleméntala o quítala: ignorarla dejaría ese trozo del perfil sin validar en silencio.`,
      );
    }
  }
}

function esDeTipo(valor, tipo) {
  if (tipo === 'array') return Array.isArray(valor);
  if (tipo === 'object') return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
  if (tipo === 'integer') return Number.isInteger(valor);
  if (tipo === 'number') return typeof valor === 'number';
  return typeof valor === tipo;
}

function tipoDe(valor) {
  if (Array.isArray(valor)) return 'array';
  if (valor === null) return 'null';
  return typeof valor;
}

function bajo(ruta, clave) {
  return ruta ? `${ruta}.${clave}` : clave;
}
