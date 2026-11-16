/**
 * @file Lógica pura de la zona de exámenes de la pantalla de consulta (HU4).
 *
 * Regla de negocio de la pantalla:
 *  - El panel derecho (asignador) trabaja sobre el BORRADOR: puede tener
 *    exámenes aún sin guardar.
 *  - La lista izquierda (resultados) muestra SOLO los exámenes ya ordenados,
 *    es decir `vista.ordenes`, lo que existe tras guardar. Si al guardar la
 *    cantidad sube o baja, la lista cambia y la selección se reconcilia.
 *
 * Todo son funciones puras (sin DOM ni red) para poder probarlas aisladas y
 * mantener PageConsulta delgada. Los ids se comparan siempre en minúsculas,
 * igual que el AtencionService.
 *
 * @typedef {{resultado?: string, interpretacion?: string}} DatosResultado
 * @typedef {Object} Borrador
 * @property {string} [referenciaExterna]
 * @property {string} [notas]
 * @property {string[]} examenes ids (idProcedimientoPasoExamen) seleccionados
 * @property {Record<string, DatosResultado>} resultados por id de examen
 */

/** Normaliza un id para compararlo (minúsculas, nunca null). */
export const clave = (id) => String(id ?? "").toLowerCase();

const texto = (valor) => String(valor ?? "").trim();

/** Normaliza las llaves de un mapa de resultados. */
function normalizarResultados(resultados = {}) {
  return Object.fromEntries(
    Object.entries(resultados).map(([id, datos]) => [clave(id), datos]),
  );
}

/** `true` si la pantalla no debe permitir edición (paso cerrado o consulta completa). */
export function soloLectura(vista) {
  return !vista.paso?.editable || Boolean(vista.completa);
}

/**
 * Qué examen queda seleccionado tras recargar la lista de órdenes.
 *  - Si el seleccionado sigue existiendo, se conserva.
 *  - Si desapareció, se toma el que ocupe su posición anterior (o el último).
 *  - Si no había selección válida, el primero.
 *  - Sin órdenes: null.
 *
 * @param {string[]} idsAnteriores ids de la lista antes de recargar
 * @param {string|null} seleccionado id seleccionado antes de recargar
 * @param {string[]} idsNuevos ids de la lista después de recargar
 * @returns {string|null}
 */
export function conciliarSeleccion(idsAnteriores, seleccionado, idsNuevos) {
  const nuevos = idsNuevos.map(clave);
  if (nuevos.length === 0) return null;

  const actual = clave(seleccionado);
  if (seleccionado != null && nuevos.includes(actual)) return actual;

  const indice = idsAnteriores.map(clave).indexOf(actual);
  if (indice < 0) return nuevos[0];
  return nuevos[Math.min(indice, nuevos.length - 1)];
}

/**
 * Borrador inicial (o reiniciado tras guardar) a partir de la vista.
 * @returns {Borrador}
 */
export function borradorDesdeVista(vista) {
  const ordenes = vista.ordenes ?? [];
  return {
    referenciaExterna: vista.referenciaExterna ?? "",
    notas: vista.notas ?? "",
    examenes: ordenes.map((o) => clave(o.idProcedimientoPasoExamen)),
    resultados: Object.fromEntries(
      ordenes.map((o) => [
        clave(o.idProcedimientoPasoExamen),
        {
          resultado: o.resultado?.resultado ?? "",
          interpretacion: o.resultado?.interpretacion ?? "",
        },
      ]),
    ),
  };
}

/** `true` si el borrador difiere de lo guardado (habilita "Guardar cambios"). */
export function hayCambios(borrador, vista) {
  const base = borradorDesdeVista(vista);

  if (texto(borrador.referenciaExterna) !== texto(base.referenciaExterna))
    return true;
  if (texto(borrador.notas) !== texto(base.notas)) return true;

  const enBorrador = new Set((borrador.examenes ?? []).map(clave));
  const guardados = new Set(base.examenes);
  if (enBorrador.size !== guardados.size) return true;
  if ([...enBorrador].some((id) => !guardados.has(id))) return true;

  const resultados = normalizarResultados(borrador.resultados);
  return [...guardados].some((id) => {
    const nuevo = resultados[id] ?? {};
    const previo = base.resultados[id];
    return (
      texto(nuevo.resultado) !== texto(previo.resultado) ||
      texto(nuevo.interpretacion) !== texto(previo.interpretacion)
    );
  });
}

/**
 * Modelo de la lista de resultados (izquierda): solo exámenes ya ordenados.
 *  - quitando: el examen salió del borrador y se eliminará al guardar.
 *  - tieneResultado: se calcula sobre el borrador, así el marcador responde al tipear.
 *  - pendientes: exámenes del borrador que aún no tienen orden (se crean al guardar).
 */
export function modeloResultados(vista, borrador, seleccionado) {
  const enBorrador = new Set((borrador.examenes ?? []).map(clave));
  const resultados = normalizarResultados(borrador.resultados);
  const ordenes = vista.ordenes ?? [];

  const items = ordenes.map((orden) => {
    const id = clave(orden.idProcedimientoPasoExamen);
    const datos = resultados[id] ?? {};
    return {
      id,
      nombre: orden.nombre,
      tieneResultado:
        texto(datos.resultado) !== "" || texto(datos.interpretacion) !== "",
      quitando: !enBorrador.has(id),
    };
  });

  const ordenados = new Set(items.map((item) => item.id));
  return {
    items,
    seleccionado: seleccionado == null ? null : clave(seleccionado),
    valores: Object.fromEntries(
      items.map((item) => [
        item.id,
        {
          resultado: resultados[item.id]?.resultado ?? "",
          interpretacion: resultados[item.id]?.interpretacion ?? "",
        },
      ]),
    ),
    pendientes: [...enBorrador].filter((id) => !ordenados.has(id)).length,
    readonly: soloLectura(vista),
  };
}

/** Modelo del panel derecho: catálogo del paso y selección del borrador. */
export function modeloAsignador(vista, borrador) {
  return {
    catalogo: (vista.examenes ?? []).map((examen) => ({
      id: clave(examen.idProcedimientoPasoExamen),
      nombre: examen.nombre,
      ordenado: Boolean(examen.ordenado),
    })),
    seleccion: (borrador.examenes ?? []).map(clave),
    readonly: soloLectura(vista),
  };
}

/** Devuelve un borrador nuevo con el examen agregado (sin duplicar). */
export function agregarExamen(borrador, id) {
  const idNormalizado = clave(id);
  const actuales = (borrador.examenes ?? []).map(clave);
  if (actuales.includes(idNormalizado))
    return { ...borrador, examenes: actuales };
  return { ...borrador, examenes: [...actuales, idNormalizado] };
}

/** Devuelve un borrador nuevo sin el examen. Conserva su texto por si se vuelve a agregar. */
export function quitarExamen(borrador, id) {
  const idNormalizado = clave(id);
  return {
    ...borrador,
    examenes: (borrador.examenes ?? [])
      .map(clave)
      .filter((x) => x !== idNormalizado),
  };
}

/**
 * Devuelve un borrador nuevo con un campo del resultado actualizado.
 * @param {"resultado"|"interpretacion"} campo
 */
export function escribirResultado(borrador, id, campo, valor) {
  const idNormalizado = clave(id);
  const resultados = normalizarResultados(borrador.resultados);
  return {
    ...borrador,
    resultados: {
      ...resultados,
      [idNormalizado]: {
        resultado: "",
        interpretacion: "",
        ...resultados[idNormalizado],
        [campo]: valor,
      },
    },
  };
}
