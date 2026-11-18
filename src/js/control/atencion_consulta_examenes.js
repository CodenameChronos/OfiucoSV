/**
 * Normaliza un id para compararlo: minúsculas y nunca `null`/`undefined`.
 *
 * @param {*} id Id a normalizar (cualquier valor; se convierte a texto).
 * @returns {string} Id en minúsculas, o `""` si el valor era `null`/`undefined`.
 * @example
 * clave("ABC-123"); // "abc-123"
 * clave(null);      // ""
 */
export const clave = (id) => String(id ?? "").toLowerCase();

/**
 * Convierte cualquier valor a texto sin espacios en los extremos.
 * Se usa para comparar campos de texto ignorando espacios sobrantes.
 *
 * @param {*} valor
 * @returns {string}
 */
const texto = (valor) => String(valor ?? "").trim();

/**
 * Devuelve una copia del mapa de resultados con las llaves normalizadas
 * (minúsculas), para poder buscar por id sin importar cómo vino escrito.
 *
 * @param {Record<string, DatosResultado>} [resultados={}]
 * @returns {Record<string, DatosResultado>}
 */
function normalizarResultados(resultados = {}) {
  return Object.fromEntries(
    Object.entries(resultados).map(([id, datos]) => [clave(id), datos]),
  );
}

/**
 * Indica si la pantalla debe bloquear la edición.
 * Es solo lectura cuando el paso no es editable o la consulta está completa.
 *
 * @param {Vista} vista
 * @returns {boolean} `true` si no se permite editar.
 */
export function soloLectura(vista) {
  return !vista.paso?.editable || Boolean(vista.completa);
}

/**
 * Decide qué examen queda seleccionado tras recargar la lista de órdenes.
 *
 * Reglas, en orden:
 *  1. Sin órdenes nuevas: `null`.
 *  2. Si el seleccionado sigue existiendo, se conserva.
 *  3. Si desapareció, se toma el que ocupe su posición anterior
 *     (o el último, si la lista quedó más corta).
 *  4. Si no había una selección válida, el primero.
 *
 * @param {string[]} idsAnteriores Ids de la lista antes de recargar.
 * @param {string|null} seleccionado Id seleccionado antes de recargar.
 * @param {string[]} idsNuevos Ids de la lista después de recargar.
 * @returns {string|null} Id (en minúsculas) a seleccionar, o `null` si no hay órdenes.
 * @example
 * // El seleccionado "b" fue eliminado: se toma el que quedó en su posición.
 * conciliarSeleccion(["a", "b", "c"], "b", ["a", "c"]); // "c"
 * // Era el último y se eliminó: se toma el nuevo último.
 * conciliarSeleccion(["a", "b"], "b", ["a"]);           // "a"
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
 * Construye el borrador inicial (o el reiniciado tras guardar) a partir de la
 * vista guardada. El borrador resultante refleja exactamente lo que hay en el
 * servidor, por lo que {@link hayCambios} devolverá `false` sobre él.
 *
 * @param {Vista} vista
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

/**
 * Indica si el borrador difiere de lo guardado (habilita "Guardar cambios").
 *
 * Compara, ignorando espacios en los extremos y mayúsculas en los ids:
 *  - `referenciaExterna` y `notas`.
 *  - El conjunto de exámenes (se agregó o se quitó alguno).
 *  - `resultado` e `interpretacion` de cada examen ya guardado.
 *
 * Los resultados de exámenes que ya no están guardados no se comparan:
 * lo relevante para ellos es que el examen se agregó o se quitó.
 *
 * @param {Borrador} borrador Estado actual del borrador.
 * @param {Vista} vista Estado guardado contra el que se compara.
 * @returns {boolean} `true` si hay al menos un cambio sin guardar.
 */
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
 * Construye el modelo de la lista de resultados (panel izquierdo).
 * Muestra solo exámenes ya ordenados; lo agregado en el borrador y aún no
 * guardado no aparece como ítem, solo se cuenta en `pendientes`.
 *
 * `tieneResultado` se calcula sobre el borrador, de modo que el marcador
 * responde mientras el usuario escribe.
 *
 * @param {Vista} vista Estado guardado.
 * @param {Borrador} borrador Estado en edición.
 * @param {string|null} seleccionado Id del examen seleccionado actualmente.
 * @returns {ModeloResultados}
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

/**
 * Construye el modelo del panel derecho (asignador): el catálogo de exámenes
 * del paso y la selección actual del borrador.
 *
 * @param {Vista} vista Estado guardado (aporta el catálogo).
 * @param {Borrador} borrador Estado en edición (aporta la selección).
 * @returns {ModeloAsignador}
 */
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

/**
 * Devuelve un borrador nuevo con el examen agregado. Es idempotente: si el
 * examen ya estaba seleccionado, no se duplica.
 *
 * @param {Borrador} borrador
 * @param {string} id Id del examen a agregar (se normaliza).
 * @returns {Borrador} Borrador nuevo; el original no se modifica.
 */
export function agregarExamen(borrador, id) {
  const idNormalizado = clave(id);
  const actuales = (borrador.examenes ?? []).map(clave);
  if (actuales.includes(idNormalizado))
    return { ...borrador, examenes: actuales };
  return { ...borrador, examenes: [...actuales, idNormalizado] };
}

/**
 * Devuelve un borrador nuevo sin el examen en la selección.
 * Conserva el texto ya escrito en `resultados`, por si el usuario vuelve a
 * agregarlo antes de guardar.
 *
 * @param {Borrador} borrador
 * @param {string} id Id del examen a quitar (se normaliza).
 * @returns {Borrador} Borrador nuevo; el original no se modifica.
 */
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
 * Si el examen aún no tenía entrada en `resultados`, se crea con ambos
 * campos vacíos antes de aplicar el valor.
 *
 * @param {Borrador} borrador
 * @param {string} id Id del examen (se normaliza).
 * @param {"resultado"|"interpretacion"} campo Campo a actualizar.
 * @param {string} valor Nuevo valor del campo.
 * @returns {Borrador} Borrador nuevo; el original no se modifica.
 * @example
 * const b2 = escribirResultado(borrador, "ABC", "resultado", "Normal");
 * b2.resultados.abc; // { resultado: "Normal", interpretacion: "" }
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
