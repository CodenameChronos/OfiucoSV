/**
 * @file Codifica y decodifica el campo `indicaciones` de OrdenExamen, que
 * guarda como texto los UUID de los procedimiento_paso_examen a realizar
 * (el esquema no tiene FK de la orden hacia el examen).
 *
 * Formato: un UUID por línea. Al leer se extraen los UUID por expresión
 * regular, así que cualquier texto adicional que alguien escriba a mano en el
 * campo no impide recuperar los ids.
 */

const UUID_EXACTO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_EN_TEXTO =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/**
 * @param {string|null|undefined} texto contenido de `indicaciones`
 * @returns {string[]} UUID en minúscula, sin repetir, en orden de aparición
 */
export function leerIds(texto) {
  const encontrados = String(texto ?? "").match(UUID_EN_TEXTO) ?? [];
  return [...new Set(encontrados.map((id) => id.toLowerCase()))];
}

/**
 * @param {string[]} ids UUID de procedimiento_paso_examen
 * @returns {string} un UUID por línea (vacío si no hay ids)
 * @throws {TypeError} si `ids` no es un arreglo o algún elemento no es UUID
 */
export function escribirIds(ids) {
  if (!Array.isArray(ids)) {
    throw new TypeError("ids debe ser un arreglo");
  }
  for (const id of ids) {
    if (typeof id !== "string" || !UUID_EXACTO.test(id)) {
      throw new TypeError(`"${id}" no es un UUID válido`);
    }
  }
  return [...new Set(ids.map((id) => id.toLowerCase()))].join("\n");
}
