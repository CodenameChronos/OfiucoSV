/**
 * @file Ordena los pasos de un procedimiento a partir de
 * procedimiento_paso_secuencia, asumiendo secuencia lineal: la referencia de
 * un paso es su paso anterior.
 *
 * Trabaja con ids (strings) puros, sin entidades ni red. El service se
 * encarga de convertir las entidades a este formato.
 */

export class ErrorSecuencia extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ErrorSecuencia";
  }
}

/**
 * @param {string[]} pasos ids de todos los pasos del procedimiento
 * @param {{paso: string, referencia: string|null}[]} secuencias filas de
 *        procedimiento_paso_secuencia. Las filas cuyo `paso` no esté en
 *        `pasos` se ignoran (pertenecen a otro procedimiento). `referencia`
 *        null o ausente significa "no tiene anterior".
 * @returns {string[]} ids en orden de ejecución
 * @throws {ErrorSecuencia} si la secuencia no es una cadena lineal completa
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

function indiceDe(orden, idPaso) {
  const i = orden.indexOf(idPaso);
  if (i === -1)
    throw new ErrorSecuencia(`El paso ${idPaso} no está en la secuencia`);
  return i;
}

/** @returns {string|null} id del paso anterior, o null si es el primero */
export function anterior(orden, idPaso) {
  return orden[indiceDe(orden, idPaso) - 1] ?? null;
}

/** @returns {string|null} id del paso siguiente, o null si es el último */
export function siguiente(orden, idPaso) {
  return orden[indiceDe(orden, idPaso) + 1] ?? null;
}
