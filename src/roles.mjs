/**
 * La tabla rol × herramienta, convertida en el frontmatter que cada herramienta sabe leer.
 *
 * Es la pieza que resuelve la parte del problema que **ningún estándar resuelve**: `AGENTS.md` no
 * tiene concepto de modelo, y cada herramienta usa su propio espacio de nombres (`opus` en una,
 * `anthropic/claude-opus-4-5` en otra, una lista priorizada en la tercera). No se intenta unificar:
 * se declara explícitamente qué modelo va en cada par, y cada bloque se emite tal cual.
 *
 * Regla que sostiene AC-9: **una herramienta sin configuración no recibe campos**. Escribir un
 * `model:` que la herramienta ignora en silencio es peor que no escribirlo, porque hace creer que la
 * elección se aplicó.
 */

/**
 * @param {string} rol
 * @param {Record<string, Record<string, object>>} modelos tabla `modelos` de showi.yml
 * @param {string[]} herramientas destinos activos, **en el orden en que se emiten**
 * @returns {string} YAML para pegar en el frontmatter; cadena vacía si no hay nada que emitir
 */
export function bloquesDeModelo(rol, modelos, herramientas) {
  return bloquesDeModelo.detalle(rol, modelos, herramientas).yaml;
}

/**
 * Lo mismo, más la lista de herramientas activas que **no admiten** selección de modelo. Se separa
 * para que `doctor` pueda contarlas y decirlas en voz alta: degradado no es lo mismo que roto, y
 * ninguna de las dos cosas es lo mismo que silencio.
 */
bloquesDeModelo.detalle = function detalle(rol, modelos, herramientas) {
  const porRol = modelos?.[rol] ?? modelos?.defecto ?? {};
  const degradadas = [];
  let yaml = '';

  for (const herramienta of herramientas) {
    const bloque = porRol[herramienta];
    if (bloque === undefined) continue; // la herramienta no está en la tabla: nada que decir
    const campos = Object.entries(bloque);
    if (campos.length === 0) {
      degradadas.push(herramienta);
      continue;
    }
    yaml += `${herramienta}:\n`;
    for (const [clave, valor] of campos) yaml += `  ${clave}: ${escalar(valor)}\n`;
  }

  return { yaml, degradadas };
};

/**
 * YAML 1.1 lee `yes`, `no`, `on`, `off` y `~` como booleanos o nulo, y `3.10` como el número 3.1.
 * Un nombre de modelo o una versión que caiga en esos casos cambiaría de tipo al leerse, así que se
 * entrecomilla. Los booleanos y los números **de verdad** se emiten crudos.
 */
function escalar(valor) {
  if (typeof valor === 'boolean' || typeof valor === 'number') return String(valor);
  if (valor === null) return 'null';
  if (Array.isArray(valor)) return `[${valor.map(escalar).join(', ')}]`;
  if (typeof valor === 'object') return JSON.stringify(valor);

  const s = String(valor);
  const ambiguo =
    /^(y|yes|n|no|true|false|on|off|null|~)$/i.test(s) ||
    /^[-+]?(\d[\d_]*(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/.test(s) ||
    /^0[xob]/i.test(s) ||
    s === '' ||
    /^[\s>|&*!%@`"'[\]{},#]/.test(s) ||
    /[:\s]$/.test(s) ||
    s.includes(': ');

  return ambiguo ? JSON.stringify(s) : s;
}
