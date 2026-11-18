/**
 * @fileoverview Codifica y decodifica los bloques estructurados por paso clínico
 * que se persisten dentro del campo `observaciones` de una consulta
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

/**
 * Expresión regular que valida el formato estándar de un identificador UUID v1-v5 (36 caracteres)
 * @type {RegExp}
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Expresión regular global para localizar bloques de paso bien delimitados dentro de `observaciones`
 * Captura en el grupo 1 el UUID del paso y en el grupo 2 el contenido JSON sin caracteres `#` literales
 * @type {RegExp}
 */
const BLOQUE = /##PASO:([0-9a-f-]{36})##([^#]*)##\/PASO##/gi;

/**
 * Valida que `idPaso` sea una cadena con formato UUID válido y la normaliza a minúsculas
 *
 * @param {string} idPaso - Identificador único del paso clínico
 * @returns {string} UUID validado y convertido a minúsculas
 * @throws {TypeError} Si `idPaso` no es una cadena o no cumple el patrón UUID
 */
function normalizarId(idPaso) {
  if (typeof idPaso !== "string" || !UUID.test(idPaso)) {
    throw new TypeError("idPaso debe ser un UUID válido");
  }
  return idPaso.toLowerCase();
}

/**
 * Serializa un objeto plano de datos a JSON escapando cualquier carácter `#` como `\u0023`
 * y lo envuelve en los marcadores de inicio y cierre del bloque del paso
 *
 * @param {string} id - UUID del paso clínico ya normalizado en minúsculas
 * @param {Object} datos - Objeto clave-valor con la información estructurada del paso
 * @returns {string} Bloque formateado listo para insertarse en `observaciones`
 * @throws {TypeError} Si `datos` es `null`, no es un objeto o es un `Array`
 */
function construirBloque(id, datos) {
  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
    throw new TypeError("datos debe ser un objeto");
  }
  const json = JSON.stringify(datos).replace(/#/g, "\\u0023");
  return `##PASO:${id}##${json}##/PASO##`;
}

/**
 * Devuelve todos los bloques de pasos registrados en el texto de `observaciones`,
 * respetando su orden de aparición
 * Los bloques con JSON dañado o que no representen un objeto plano se omiten silenciosamente
 * en lugar de lanzar error, para que un registro corrupto no impida mostrar el resto del historial
 *
 * @param {string|null|undefined} texto - Contenido crudo del campo `observaciones` de la consulta
 * @returns {Array<{ idPaso: string, datos: Object }>} Arreglo de pares `{ idPaso, datos }` extraídos
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
 * Busca y decodifica los datos estructurados correspondientes a un paso específico
 * dentro del campo `observaciones`
 *
 * @param {string|null|undefined} texto - Contenido crudo del campo `observaciones`
 * @param {string} idPaso - UUID del paso clínico a consultar
 * @returns {Object|null} Objeto con los datos del paso o `null` si no existe un bloque válido
 * @throws {TypeError} Si `idPaso` no es un UUID válido
 */
export function leerPaso(texto, idPaso) {
  const id = normalizarId(idPaso);
  return leerTodos(texto).find((p) => p.idPaso === id)?.datos ?? null;
}

/**
 * Devuelve una nueva cadena de `observaciones` con el bloque del paso indicado reemplazado
 * (si ya existía) o anexado al final en una nueva línea (si es nuevo)
 * No altera ningún otro bloque existente ni el texto libre fuera de los delimitadores
 *
 * @param {string|null|undefined} texto - Contenido actual del campo `observaciones`
 * @param {string} idPaso - UUID del paso clínico a escribir o actualizar
 * @param {Object} datos - Objeto de datos estructurados a serializar dentro del bloque
 * @returns {string} Cadena resultante actualizada con el bloque del paso
 * @throws {TypeError} Si `idPaso` no es un UUID válido o `datos` no es un objeto plano
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