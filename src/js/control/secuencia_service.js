/**
 * @fileoverview Ordena los pasos de un procedimiento clínico a partir de los registros
 * de `procedimiento_paso_secuencia`, asumiendo una secuencia lineal en la que la referencia
 * de un paso apunta a su paso anterior.
 *
 * Trabaja con ids (strings) puros, sin entidades ni red. El service se
 * encarga de convertir las entidades a este formato.
 */

/**
 * Error de dominio lanzado cuando las relaciones de `procedimiento_paso_secuencia`
 * no forman una cadena lineal única y válida (por ejemplo: pasos duplicados, bifurcaciones,
 * ciclos, múltiples inicios o referencias huérfanas).
 *
 * @extends Error
 */
export class ErrorSecuencia extends Error {
  /**
   * Crea una nueva instancia de `ErrorSecuencia` con el mensaje descriptivo indicado.
   *
   * @param {string} mensaje - Descripción detallada de la inconsistencia detectada en la secuencia.
   */
  constructor(mensaje) {
    super(mensaje);
    /** @type {string} Nombre identificador del tipo de error (`"ErrorSecuencia"`). */
    this.name = "ErrorSecuencia";
  }
}

/**
 * Ordena linealmente los identificadores de los pasos de un procedimiento según sus
 * relaciones de precedencia (`referencia` -> `paso`).
 *
 * @param {string[]} pasos - Identificadores únicos de todos los pasos del procedimiento.
 * @param {Array<{ paso: string, referencia: string|null }>} secuencias - Filas de `procedimiento_paso_secuencia`.
 *        Las filas cuyo `paso` no esté en `pasos` se ignoran (pertenecen a otro procedimiento).
 *        Una `referencia` nula o ausente indica que el paso no tiene anterior.
 * @returns {string[]} Arreglo de identificadores ordenados secuencialmente desde el paso inicial hasta el final.
 * @throws {ErrorSecuencia} Si hay pasos repetidos, referencias externas, autorreferencias,
 *         ramificaciones, más de un paso inicial, ciclos o desconexiones.
 */
export function ordenar(pasos, secuencias) {
  if (pasos.length === 0) return [];

  const conjunto = new Set(pasos);
  if (conjunto.size !== pasos.length) {
    throw new ErrorSecuencia("Hay pasos repetidos");
  }

  const sucesor = new Map();
  const conAnterior = new Set();

  for (const { paso, referencia } of secuencias) {
    if (!conjunto.has(paso) || referencia == null) continue;
    if (!conjunto.has(referencia)) {
      throw new ErrorSecuencia(
        `La referencia ${referencia} no pertenece al procedimiento`,
      );
    }
    if (paso === referencia) {
      throw new ErrorSecuencia(`El paso ${paso} se referencia a sí mismo`);
    }
    if (conAnterior.has(paso)) {
      throw new ErrorSecuencia(`El paso ${paso} tiene más de un anterior`);
    }
    if (sucesor.has(referencia)) {
      throw new ErrorSecuencia(
        `El paso ${referencia} tiene más de un siguiente (secuencia no lineal)`,
      );
    }
    sucesor.set(referencia, paso);
    conAnterior.add(paso);
  }

  const inicios = pasos.filter((p) => !conAnterior.has(p));
  if (inicios.length !== 1) {
    throw new ErrorSecuencia(
      `Se esperaba un único paso inicial y hay ${inicios.length}`,
    );
  }

  // Con a lo sumo un anterior y un siguiente por paso, y un único inicio sin
  // anterior, el recorrido es un camino simple: no puede ciclar.
  const orden = [];
  for (
    let actual = inicios[0];
    actual !== undefined;
    actual = sucesor.get(actual)
  ) {
    orden.push(actual);
  }
  if (orden.length !== pasos.length) {
    throw new ErrorSecuencia(
      "La secuencia está desconectada o contiene un ciclo",
    );
  }
  return orden;
}

/**
 * Obtiene el índice numérico de `idPaso` dentro de la secuencia ordenada, lanzando
 * un error si el paso no forma parte de ella.
 *
 * @param {string[]} orden - Lista de pasos ya ordenada secuencialmente.
 * @param {string} idPaso - Identificador del paso cuya posición se desea consultar.
 * @returns {number} Índice base 0 del paso dentro de `orden`.
 * @throws {ErrorSecuencia} Si `idPaso` no se encuentra en `orden`.
 */
function indiceDe(orden, idPaso) {
  const i = orden.indexOf(idPaso);
  if (i === -1)
    throw new ErrorSecuencia(`El paso ${idPaso} no está en la secuencia`);
  return i;
}

/**
 * Devuelve el identificador del paso inmediatamente anterior a `idPaso` dentro
 * de la secuencia ordenada.
 *
 * @param {string[]} orden - Lista de pasos ordenada secuencialmente.
 * @param {string} idPaso - Identificador del paso de referencia.
 * @returns {string|null} Identificador del paso anterior, o `null` si `idPaso` es el primero.
 * @throws {ErrorSecuencia} Si `idPaso` no pertenece a `orden`.
 */
export function anterior(orden, idPaso) {
  return orden[indiceDe(orden, idPaso) - 1] ?? null;
}

/**
 * Devuelve el identificador del paso inmediatamente posterior a `idPaso` dentro
 * de la secuencia ordenada.
 *
 * @param {string[]} orden - Lista de pasos ordenada secuencialmente.
 * @param {string} idPaso - Identificador del paso de referencia.
 * @returns {string|null} Identificador del paso siguiente, o `null` si `idPaso` es el último.
 * @throws {ErrorSecuencia} Si `idPaso` no pertenece a `orden`.
 */
export function siguiente(orden, idPaso) {
  return orden[indiceDe(orden, idPaso) + 1] ?? null;
}