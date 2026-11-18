/**
 * @file Estados de un consulta_procedimiento_paso y reglas de transición.
 */

export const Estado = Object.freeze({
  CREADO: "Creado",
  EN_CURSO: "En curso",
  FINALIZADO: "Finalizado",
  PENDIENTE: "Pendiente",
});

export class ErrorEstado extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ErrorEstado";
  }
}

const CANONICOS = new Map(
  Object.values(Estado).map((e) => [e.toLowerCase(), e]),
);

/**
 * @param {unknown} texto estado crudo del backend
 * @returns {string|null} el valor canónico de `Estado`, o null si no se reconoce
 */
export function parsearEstado(texto) {
  if (typeof texto !== "string") return null;
  return CANONICOS.get(texto.trim().toLowerCase()) ?? null;
}

const enCurso = (estado) => parsearEstado(estado) === Estado.EN_CURSO;

/** Solo un paso "En curso" admite cambios; los demás se muestran en lectura. */
export function puedeEditar(estado) {
  return enCurso(estado);
}

export function puedeAvanzar(estado, haySiguiente) {
  return enCurso(estado) && Boolean(haySiguiente);
}

export function puedeRetroceder(estado, hayAnterior) {
  return enCurso(estado) && Boolean(hayAnterior);
}

/**
 * Finalizar el PROCEDIMIENTO solo aplica en su último paso. Finalizar la
 * consulta es una acción distinta (ver puedeFinalizarConsulta).
 */
export function puedeFinalizar(estado, haySiguiente) {
  return enCurso(estado) && !haySiguiente;
}

/**
 * @returns {{actual: string, siguiente: string}} estados a guardar
 * @throws {ErrorEstado} si no se puede avanzar
 */
export function alAvanzar(estadoActual, haySiguiente) {
  if (!puedeAvanzar(estadoActual, haySiguiente)) {
    throw new ErrorEstado(
      haySiguiente
        ? `No se puede avanzar desde un paso en estado "${estadoActual}"`
        : "No se puede avanzar: es el último paso",
    );
  }
  return { actual: Estado.FINALIZADO, siguiente: Estado.EN_CURSO };
}

/**
 * @returns {{actual: string, anterior: string}} estados a guardar
 * @throws {ErrorEstado} si no se puede retroceder
 */
export function alRetroceder(estadoActual, hayAnterior) {
  if (!puedeRetroceder(estadoActual, hayAnterior)) {
    throw new ErrorEstado(
      hayAnterior
        ? `No se puede retroceder desde un paso en estado "${estadoActual}"`
        : "No se puede retroceder: es el primer paso",
    );
  }
  return { actual: Estado.PENDIENTE, anterior: Estado.EN_CURSO };
}

/**
 * @returns {string} estado final del último paso
 * @throws {ErrorEstado} si no es el último paso o no está en curso
 */
export function alFinalizar(estadoActual, haySiguiente) {
  if (!puedeFinalizar(estadoActual, haySiguiente)) {
    throw new ErrorEstado(
      haySiguiente
        ? "No se puede finalizar: aún hay pasos siguientes"
        : `No se puede finalizar desde un paso en estado "${estadoActual}"`,
    );
  }
  return Estado.FINALIZADO;
}

/**
 * La consulta se finaliza aparte, cuando todos sus procedimientos ya están
 * finalizados y la consulta todavía no se cerró.
 * @param {boolean} todosLosProcedimientosCompletos
 * @param {boolean} consultaFinalizada
 */
export function puedeFinalizarConsulta(
  todosLosProcedimientosCompletos,
  consultaFinalizada,
) {
  return Boolean(todosLosProcedimientosCompletos) && !consultaFinalizada;
}

/**
 * @throws {ErrorEstado} si la consulta ya está finalizada o aún hay
 *         procedimientos sin finalizar
 */
export function alFinalizarConsulta(
  todosLosProcedimientosCompletos,
  consultaFinalizada,
) {
  if (consultaFinalizada) {
    throw new ErrorEstado("La consulta ya está finalizada");
  }
  if (!todosLosProcedimientosCompletos) {
    throw new ErrorEstado(
      "No se puede finalizar la consulta: aún hay procedimientos sin finalizar",
    );
  }
}

/**
 * Estado visual para el stepper.
 * @returns {"hecho"|"actual"|"pendiente"}
 */
export function aEstadoVisual(estado) {
  switch (parsearEstado(estado)) {
    case Estado.FINALIZADO:
      return "hecho";
    case Estado.EN_CURSO:
      return "actual";
    default:
      return "pendiente";
  }
}