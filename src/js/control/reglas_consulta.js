/**
 * @file Reglas de la pantalla de atención (HU4), como funciones puras.
 *
 * Trabajan con formas simples ({id, ...}) y no con las entities: el service
 * es quien convierte las entities (con sus relaciones anidadas) a estas
 * formas, de modo que estas reglas no dependen del JSON del backend.
 */
import { leerIds, escribirIds } from "./indicaciones_service.js";
import { Estado, parsearEstado } from "./estado_paso.js";

/**
 * UUID de los exámenes que ya tienen orden en este paso.
 * @param {{indicaciones: string|null}[]} ordenes órdenes del paso actual
 * @returns {string[]}
 */
export function idsOrdenados(ordenes) {
  return leerIds(ordenes.map((o) => o?.indicaciones ?? "").join("\n"));
}

/**
 * De los exámenes marcados por el médico, los que todavía no tienen orden.
 * Evita crear órdenes duplicadas si se pulsa "Asignar" dos veces.
 * @param {string[]} seleccionados UUID de procedimiento_paso_examen marcados
 * @param {{indicaciones: string|null}[]} ordenes órdenes ya existentes del paso
 * @returns {string[]} UUID sin repetir, en minúscula, en el orden marcado
 * @throws {TypeError} si `seleccionados` no es un arreglo de UUID
 */
export function examenesPorOrdenar(seleccionados, ordenes) {
  const yaOrdenados = new Set(idsOrdenados(ordenes));
  return leerIds(escribirIds(seleccionados)).filter(
    (id) => !yaOrdenados.has(id),
  );
}

const tieneTexto = (valor) => typeof valor === "string" && valor.trim() !== "";
const clave = (id) => String(id).toLowerCase();

/**
 * Órdenes que no tienen ningún resultado con texto. Alimenta el aviso de
 * confirmación al avanzar o finalizar.
 * @param {{id: string}[]} ordenes
 * @param {{idOrden: string, resultado: string|null}[]} resultados
 * @returns {string[]} ids de las órdenes sin resultado
 */
export function ordenesSinResultado(ordenes, resultados) {
  const conResultado = new Set(
    resultados
      .filter((r) => tieneTexto(r?.resultado))
      .map((r) => clave(r.idOrden)),
  );
  return ordenes.filter((o) => !conResultado.has(clave(o.id))).map((o) => o.id);
}

/**
 * Texto del aviso de confirmación.
 * @returns {string|null} null si no hay nada pendiente
 */
export function mensajeResultadosPendientes(cantidad) {
  if (!Number.isInteger(cantidad) || cantidad <= 0) return null;
  const nombre = cantidad === 1 ? "examen" : "exámenes";
  return `Hay ${cantidad} ${nombre} sin resultado. ¿Desea continuar de todos modos?`;
}

/**
 * Edad en años cumplidos.
 * La fecha de nacimiento se lee en UTC: la columna es timestamptz y un
 * "1990-05-15T00:00:00Z" leído con la zona local (UTC-6) caería el día 14.
 * @param {string|number|Date|null|undefined} fechaNacimiento
 * @param {Date} [hoy]
 * @returns {number|null} null si la fecha falta, es inválida o es futura
 */
export function calcularEdad(fechaNacimiento, hoy = new Date()) {
  if (fechaNacimiento == null || fechaNacimiento === "") return null;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return null;

  let edad = hoy.getFullYear() - nacimiento.getUTCFullYear();
  const meses = hoy.getMonth() - nacimiento.getUTCMonth();
  if (meses < 0 || (meses === 0 && hoy.getDate() < nacimiento.getUTCDate())) {
    edad--;
  }
  return edad < 0 ? null : edad;
}

/**
 * Paso que se muestra al abrir la consulta: el que está "En curso" y, si no
 * hay ninguno, el primero (en orden) que no esté finalizado, incluidos los que
 * aún no tienen registro.
 * @param {string[]} orden ids de los pasos en orden (de secuencia_lineal)
 * @param {Record<string,string>|Map<string,string>} estados estado por paso
 * @returns {string|null} null si todos están finalizados (consulta completa)
 */
export function pasoActual(orden, estados) {
  const estadoDe = (id) =>
    parsearEstado(estados instanceof Map ? estados.get(id) : estados[id]);
  return (
    orden.find((id) => estadoDe(id) === Estado.EN_CURSO) ??
    orden.find((id) => estadoDe(id) !== Estado.FINALIZADO) ??
    null
  );
}
