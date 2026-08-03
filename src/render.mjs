/**
 * Motor de plantillas del harness.
 *
 * Cinco constructos y ni uno más: interpolación, iteración, bloque invertido, parcial y
 * comentario. **No hay condicionales, ni filtros, ni expresiones, y nada se evalúa como código.**
 *
 * La restricción es el mecanismo, no una preferencia estética: un motor con lógica invita a meter
 * reglas en la plantilla, y las reglas del método viven en las skills. Si una plantilla necesita
 * decidir algo, el dato se precalcula antes y entra ya resuelto en el contexto.
 *
 * Tampoco toca el sistema de ficheros: los parciales se resuelven por callback. Así el motor se
 * prueba entero sin fixtures, y una plantilla no puede leer un archivo por su cuenta.
 */

const COMENTARIO = /\{\{!--[\s\S]*?--\}\}/g;
const APERTURA = /\{\{([#^])\s*([\w.]+)\s*\}\}/;
// Los centinelas de llave impiden que `{{{x}}}` o `{{&x}}` —constructos de otros motores que aquí
// NO se soportan— se resuelvan a medias comiéndose unas llaves. Un constructo no soportado se emite
// entero, para que se vea.
const VALOR = /(?<!\{)\{\{\s*([\w.]+|\.)\s*\}\}(?!\})/g;
const PARCIAL = /\{\{>\s*([\w.-]+)\s*\}\}/g;

/**
 * @param {string} plantilla
 * @param {Record<string, unknown>} [contexto]
 * @param {{ parcial?: (nombre: string) => string }} [opciones]
 * @returns {string}
 */
export function render(plantilla, contexto = {}, opciones = {}) {
  // Los comentarios se borran antes que nada: lo que hay dentro de un comentario no se interpola
  // ni cuenta como apertura de bloque.
  return renderBloques(String(plantilla).replace(COMENTARIO, ''), contexto, opciones);
}

function renderBloques(texto, ctx, opciones) {
  const apertura = APERTURA.exec(texto);
  if (!apertura) return interpolar(texto, ctx, opciones);

  const [etiqueta, tipo, nombre] = apertura;
  const inicioCuerpo = apertura.index + etiqueta.length;
  const { cuerpo, fin } = cortarBloque(texto, inicioCuerpo, nombre);
  const valor = resolver(ctx, nombre);

  let medio = '';
  if (tipo === '#') {
    for (const item of aLista(valor)) medio += renderBloques(cuerpo, ampliar(ctx, item), opciones);
  } else if (esVacio(valor)) {
    medio = renderBloques(cuerpo, ctx, opciones);
  }

  return (
    interpolar(texto.slice(0, apertura.index), ctx, opciones) +
    medio +
    renderBloques(texto.slice(fin), ctx, opciones)
  );
}

/** Encuentra el cierre que corresponde, contando las aperturas anidadas del mismo nombre. */
function cortarBloque(texto, desde, nombre) {
  const abre = new RegExp(`\\{\\{[#^]\\s*${escapar(nombre)}\\s*\\}\\}`, 'g');
  const cierra = new RegExp(`\\{\\{/\\s*${escapar(nombre)}\\s*\\}\\}`, 'g');
  let profundidad = 1;
  let cursor = desde;

  while (profundidad > 0) {
    cierra.lastIndex = cursor;
    const c = cierra.exec(texto);
    if (!c) throw new Error(`Bloque «${nombre}» sin cerrar en la plantilla.`);

    abre.lastIndex = cursor;
    let a;
    while ((a = abre.exec(texto)) && a.index < c.index) profundidad += 1;

    profundidad -= 1;
    cursor = c.index + c[0].length;
    if (profundidad === 0) return { cuerpo: texto.slice(desde, c.index), fin: cursor };
  }
  /* c8 ignore next */
  throw new Error(`Bloque «${nombre}» sin cerrar en la plantilla.`);
}

function interpolar(texto, ctx, opciones) {
  // Los valores primero y los parciales después, para que el contenido de un parcial entre
  // **literal**: un parcial es un trozo de texto ya escrito, no otra plantilla que ejecutar.
  const conValores = texto.replace(VALOR, (_, ruta) => {
    const v = resolver(ctx, ruta);
    // Una función no se invoca (sería evaluar código) ni se vuelca (filtraría su fuente).
    if (v === undefined || v === null || typeof v === 'function') return '';
    return String(v);
  });

  return conValores.replace(PARCIAL, (_, nombre) => {
    if (typeof opciones.parcial !== 'function') {
      throw new Error(
        `No hay forma de resolver el parcial «${nombre}»: falta la opción "parcial".`,
      );
    }
    return String(opciones.parcial(nombre));
  });
}

/**
 * Solo claves **propias**. Caminar la cadena de prototipos dejaría que una plantilla leyera cosas
 * que nadie puso en el contexto —`constructor`, `toString`, `__proto__`—, y una plantilla no es
 * necesariamente de quien la ejecuta.
 */
function resolver(ctx, ruta) {
  if (ruta === '.') return Object.hasOwn(ctx, '.') ? ctx['.'] : undefined;
  let actual = ctx;
  for (const paso of ruta.split('.')) {
    if (actual === null || typeof actual !== 'object' || !Object.hasOwn(actual, paso)) {
      return undefined;
    }
    actual = actual[paso];
  }
  return actual;
}

/** El elemento de una iteración ve sus propios campos, `.` a sí mismo, y el contexto de fuera. */
function ampliar(ctx, item) {
  const base = { ...ctx, '.': item };
  return item !== null && typeof item === 'object' && !Array.isArray(item)
    ? { ...base, ...item }
    : base;
}

function aLista(valor) {
  if (Array.isArray(valor)) return valor;
  if (valor === undefined || valor === null || valor === false || valor === '') return [];
  return [valor];
}

function esVacio(valor) {
  return Array.isArray(valor) ? valor.length === 0 : !valor;
}

function escapar(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
