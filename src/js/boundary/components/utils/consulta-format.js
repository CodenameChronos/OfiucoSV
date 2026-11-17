/**
 * @fileoverview Formato de los datos de una consulta tal como los entrega el API.
 * Utilidades compartidas entre el dashboard y los componentes encargados de renderizar
 * información de consultas médicas (nombres de relaciones, fechas formateadas y datos del paciente).
 */

/**
 * Extrae el nombre legible de una relación o entidad proveniente del API.
 * Si el valor ya es una cadena de texto, la devuelve directamente; si es un objeto,
 * intenta resolver `nombre` o `descripcion`, retornando `fallback` en caso contrario.
 *
 * @param {string|{ nombre?: string, descripcion?: string }|null|undefined} value - Valor o entidad relacionada.
 * @param {string} fallback - Texto alternativo a devolver si no se encuentra un nombre válido.
 * @returns {string} Nombre resuelto de la relación o el valor por defecto `fallback`.
 */
export const relationName = (value, fallback) => {
  if (typeof value === "string") return value;
  return value?.nombre ?? value?.descripcion ?? fallback;
};

/**
 * Formatea una fecha proveniente del API (incluyendo cadenas ISO-8601 con sufijo `[UTC]`)
 * a una representación legible según la configuración regional `es-SV` (`dateStyle: "medium"`, `timeStyle: "short"`).
 *
 * @param {string|number|Date|null|undefined} value - Fecha a parsear y formatear.
 * @returns {string} Fecha formateada, `"Sin fecha"` si el valor es vacío/nulo, o `"Fecha no válida"` si no puede parsearse.
 */
export const formatDate = (value) => {
  if (!value) return "Sin fecha";
  const parsed = new Date(String(value).replace(/\[UTC\]$/, ""));
  return Number.isNaN(parsed.getTime()) ? "Fecha no válida" : parsed.toLocaleString("es-SV", {
    dateStyle: "medium", timeStyle: "short"
  });
};

/**
 * Obtiene el nombre completo del paciente asociado a una consulta médica.
 * Busca la entidad del paciente en las propiedades `paciente`, `idPaciente` o `persona`,
 * concatena `nombres` y `apellidos`, o recurre a `nombrePaciente` como respaldo.
 *
 * @param {Object|null|undefined} consultation - Objeto con los datos de la consulta médica.
 * @returns {string} Nombre completo del paciente o `"No disponible en los datos del API"` si no está presente.
 */
export const getPatientName = (consultation) => {
  const patient = consultation?.paciente ?? consultation?.idPaciente ?? consultation?.persona ?? null;
  const fullName = [patient?.nombres, patient?.apellidos].filter(Boolean).join(" ").trim();
  return fullName || consultation?.nombrePaciente || "No disponible en los datos del API";
};