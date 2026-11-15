/**
 * @file Codifica y decodifica los bloques por paso que se guardan dentro del
 * campo `observaciones` de una consulta.
 *
 * Formato de cada bloque:
 *   ##PASO:{uuid-del-paso}##{json}##/PASO##
 *
 * Reglas que garantizan que el texto del médico nunca rompa el formato:
 *  - El JSON se serializa con JSON.stringify (escapa saltos de línea y
 *    comillas) y además se reemplaza cada "#" por \u0023, que sigue siendo
 *    JSON válido. Así dentro del bloque no existe ningún "#" literal y el
 *    texto libre no puede imitar un marcador.
 *  - El id del paso se valida como UUID antes de usarse (también en la
 *    expresión regular).
 *  - Lo que haya fuera de los bloques se conserva intacto.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BLOQUE = /##PASO:([0-9a-f-]{36})##([^#]*)##\/PASO##/gi;

function normalizarId(idPaso) {
  if (typeof idPaso !== "string" || !UUID.test(idPaso)) {
    throw new TypeError("idPaso debe ser un UUID válido");
  }
  return idPaso.toLowerCase();
}

function construirBloque(id, datos) {
  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
    throw new TypeError("datos debe ser un objeto");
  }
  const json = JSON.stringify(datos).replace(/#/g, "\\u0023");
  return `##PASO:${id}##${json}##/PASO##`;
}

/**
 * Devuelve todos los pasos registrados, en orden de aparición.
 * Los bloques con JSON dañado se omiten en lugar de lanzar error, para que un
 * registro corrupto no impida mostrar el resto del historial.
 * @param {string|null|undefined} texto contenido de `observaciones`
 * @returns {{idPaso: string, datos: object}[]}
 */
export function leerTodos(texto) {
  const salida = [];
  for (const m of String(texto ?? "").matchAll(BLOQUE)) {
    try {
      const datos = JSON.parse(m[2]);
      if (
        datos !== null &&
        typeof datos === "object" &&
        !Array.isArray(datos)
      ) {
        salida.push({ idPaso: m[1].toLowerCase(), datos });
      }
    } catch {
      // bloque dañado: se ignora
    }
  }
  return salida;
}

/**
 * @param {string|null|undefined} texto
 * @param {string} idPaso
 * @returns {object|null} datos del paso, o null si no hay bloque válido
 */
export function leerPaso(texto, idPaso) {
  const id = normalizarId(idPaso);
  return leerTodos(texto).find((p) => p.idPaso === id)?.datos ?? null;
}

/**
 * Devuelve el texto con el bloque del paso reemplazado, o agregado al final
 * si no existía. No modifica ningún otro bloque ni el texto externo.
 * @param {string|null|undefined} texto
 * @param {string} idPaso
 * @param {object} datos
 * @returns {string}
 */
export function escribirPaso(texto, idPaso, datos) {
  const id = normalizarId(idPaso);
  const bloque = construirBloque(id, datos);
  const base = String(texto ?? "");
  const existente = new RegExp(`##PASO:${id}##[^#]*##/PASO##`, "i");
  if (existente.test(base)) {
    // función en vez de string: evita que "$&" o "$1" del texto se interpreten
    return base.replace(existente, () => bloque);
  }
  return base === "" ? bloque : `${base}\n${bloque}`;
}
