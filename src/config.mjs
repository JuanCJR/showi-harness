/**
 * Los ficheros de configuración, construidos desde el perfil.
 *
 * Por qué se construyen en código y no se plantillan enteros: son JSON, y el JSON generado por
 * concatenación de texto se rompe por una coma. Aquí se arma la estructura —válida por
 * construcción— y la plantilla pone lo único que un serializador no sabe poner: la cabecera que
 * explica de dónde salió el fichero y que no se edita a mano.
 */

const METODO = [
  'spec-driven-development',
  'test-driven-development-tdd',
  'stop-and-report',
  'verification-and-measurement',
];

const REPO_METODO = 'JuanCJR/showi-harness';

/**
 * `rulesync.jsonc`: qué destinos, qué features y de dónde se traen skills y reglas.
 *
 * La primera fuente es **el método, fijado por tag**. Una rama haría que dos clones del mismo
 * commit instalaran métodos distintos, que es la clase de divergencia que este repositorio existe
 * para acabar.
 */
export function rulesyncConfig(perfil, versionMetodo) {
  const targets = {};
  for (const herramienta of perfil.herramientas.activas) targets[herramienta] = ['*'];

  const sources = [
    { source: `${REPO_METODO}@v${versionMetodo}`, skills: [...METODO], rules: ['metodo'] },
    ...(perfil.skills_terceros ?? []).map((s) => ({
      // rulesync toma la subruta pegada al origen con `:`, no como campo aparte.
      source: s.path && s.path !== '.' ? `${s.source}:${s.path}` : s.source,
      ...(s.path === '.' ? { path: '.' } : {}),
      skills: s.skills,
    })),
  ];

  return {
    $schema: 'https://github.com/dyoshikawa/rulesync/releases/latest/download/config-schema.json',
    targets,
    outputRoots: ['.'],
    delete: true,
    sources,
  };
}

/**
 * Los hooks. rulesync los reparte a los formatos nativos de cada herramienta; aquí solo se dice qué
 * se observa. Un hook apagado en el perfil **no se emite**: una configuración que declara un
 * observador que no observa es peor que no tenerlo, porque su silencio se lee como un cero.
 */
export function hooksConfig(perfil) {
  const inst = perfil.instrumentacion;
  if (!inst?.habilitada) return {};

  const destino = inst.destino;
  const preToolUse = [];
  const postToolUse = [];

  if (inst.hooks?.log_skill_usage?.activo) {
    postToolUse.push({
      type: 'command',
      name: 'log-skill-usage',
      matcher: 'Skill',
      command: `python3 ${destino}/hooks/log-skill-usage.py`,
      timeout: 5,
    });
  }
  if (inst.hooks?.delegation_watch?.activo) {
    preToolUse.push({
      type: 'command',
      name: 'delegation-watch',
      matcher: 'Write|Edit|NotebookEdit',
      command: `python3 ${destino}/hooks/delegation-watch.py`,
      timeout: 5,
    });
  }

  return { hooks: { preToolUse, postToolUse } };
}

/** Los permisos, tal cual los declara el perfil. No se añade ninguno que no esté escrito. */
export function permisosConfig(perfil) {
  const salida = {};
  for (const [categoria, reglas] of Object.entries(perfil.permisos ?? {})) {
    salida[categoria] = { ...reglas };
  }
  return salida;
}

/**
 * Los servidores MCP **habilitados**. Uno declarado y no habilitado no se emite: es exactamente el
 * cruce que dejó tres skills muertas durante siete specs, resuelto en el origen en vez de
 * descubierto tarde.
 *
 * Las cadenas de conexión pasan intactas, con su interpolación de entorno sin resolver: resolverla
 * aquí metería una credencial en un fichero versionado.
 */
export function mcpConfig(perfil) {
  const mcp = perfil.mcp ?? {};
  const mcpServers = {};
  for (const nombre of mcp.habilitados ?? []) {
    const servidor = mcp.servidores?.[nombre];
    if (servidor) mcpServers[nombre] = structuredClone(servidor);
  }
  return { mcpServers };
}
