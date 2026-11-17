/**
 * @fileoverview Reglas de negocio de la pantalla de atención clínica (HU4), implementadas
 * como funciones puras. Operan sobre estructuras normalizadas y planas (`{ id, ... }`)
 * desacopladas de las entidades ORM/JSON del backend, dejando que la capa de servicio
 * realice la proyección previa.
 */
import { leerIds, escribirIds } from "./indicaciones_service.js";
import { Estado, parsearEstado } from "./estado_paso.js";

/**
 * Normaliza un identificador a cadena en minúsculas para comparaciones seguras (nunca `null`).
 *
 * @param {string|number|null|undefined} id - Identificador a normalizar.
 * @returns {string} Representación en minúsculas o cadena vacía si es nulo/indefinido.
 */
export const clave = (id) => String(id ?? "").toLowerCase();

/**
 * Verifica que un valor sea una cadena de texto no vacía tras recortar espacios.
 *
 * @param {*} valor - Valor a evaluar.
 * @returns {boolean} `true` si es un `string` con contenido visible.
 */
const texto = (valor) => typeof valor === "string" && valor.trim() !== "";

/**
 * Convierte un valor nulo o indefinido en cadena vacía sin alterar cadenas existentes.
 *
 * @param {*} v - Valor de entrada.
 * @returns {string} Cadena resultante.
 */
const textoOGenerico = (v) => String(v ?? "");

/**
 * Extrae los UUID de `procedimiento_paso_examen` de los exámenes que ya cuentan
 * con una orden registrada en el paso actual.
 *
 * @param {Array<{ indicaciones: string|null }>} ordenes - Órdenes de examen del paso actual.
 * @returns {string[]} Lista de UUIDs extraídos de las indicaciones de las órdenes.
 */
export function idsOrdenados(ordenes) {
  return leerIds((ordenes || []).map((o) => o?.indicaciones ?? "").join("\n"));
}

/**
 * Filtra los exámenes seleccionados por el médico para obtener únicamente aquellos
 * que aún no poseen una orden de examen emitida en el paso.
 *
 * @param {string[]} seleccionados - UUIDs de `procedimiento_paso_examen` marcados.
 * @param {Array<{ indicaciones: string|null }>} ordenes - Órdenes ya existentes en el paso.
 * @returns {string[]} UUIDs de exámenes pendientes de ordenar.
 */
export function examenesPorOrdenar(seleccionados, ordenes) {
  const yaOrdenados = new Set(idsOrdenados(ordenes));
  return leerIds(escribirIds(seleccionados || [])).filter(
    (id) => !yaOrdenados.has(id),
  );
}

/**
 * Identifica las órdenes de examen que aún no tienen ningún resultado con texto registrado.
 *
 * @param {Array<{ id: string }>} ordenes - Lista de órdenes de examen vigentes.
 * @param {Array<{ idOrden: string, resultado: string|null }>} resultados - Resultados registrados asociados a órdenes.
 * @returns {string[]} Arreglo con los `id` de las órdenes sin resultado textual.
 */
export function ordenesSinResultado(ordenes, resultados) {
  const conResultado = new Set(
    (resultados || [])
      .filter((r) => texto(r?.resultado))
      .map((r) => clave(r.idOrden)),
  );
  return (ordenes || [])
    .filter((o) => !conResultado.has(clave(o.id)))
    .map((o) => o.id);
}

/**
 * Planifica qué órdenes de examen deben crearse y cuáles deben eliminarse comparando
 * la selección actual del borrador contra las órdenes previamente persistidas en el paso.
 *
 * @param {string[]} seleccionadosBorrador - IDs de `procedimiento_paso_examen` seleccionados en el borrador.
 * @param {Array<{ id: string, indicaciones: string|null, tieneResultado: boolean }>} ordenesExistentes - Órdenes ya guardadas en el backend.
 * @returns {{ crear: string[], quitar: Array<{ idOrden: string, idPpe: string, tieneResultado: boolean, indicaciones: string|null }> }} Plan de sincronización de órdenes.
 */
export function planificarSeleccion(seleccionadosBorrador, ordenesExistentes) {
  const seleccionadosSet = new Set((seleccionadosBorrador || []).map(clave));

  const ordenesMapeadas = (ordenesExistentes || []).map((o) => {
    const idPpe = leerIds(o.indicaciones)[0] ?? null;
    return {
      idOrden: o.id,
      idPpe: idPpe ? clave(idPpe) : null,
      tieneResultado: Boolean(o.tieneResultado),
      indicaciones: o.indicaciones,
    };
  });

  const ppeOrdenadosSet = new Set(
    ordenesMapeadas.map((o) => o.idPpe).filter(Boolean),
  );

  // Exámenes seleccionados en el borrador que todavía no tienen orden creada -> CREAR
  const crear = (seleccionadosBorrador || [])
    .map(clave)
    .filter((id) => !ppeOrdenadosSet.has(id));

  // Órdenes existentes cuyo PPE ya no se encuentra seleccionado en el borrador -> QUITAR
  const quitar = ordenesMapeadas.filter(
    (o) => o.idPpe && !seleccionadosSet.has(o.idPpe),
  );

  return { crear, quitar };
}

/**
 * Detecta qué registros de resultados deben crearse o actualizarse comparando las órdenes
 * vigentes con los valores ingresados en el borrador del formulario.
 *
 * @param {Array<{ idOrden: string, idPpe: string, resultado: { id: string, resultado: string, interpretacion: string }|null }>} vigentes - Órdenes activas tras aplicar cambios de selección.
 * @param {Record<string, { resultado?: string, interpretacion?: string }>} resultadosBorrador - Mapa indexado por `idPpe` con los valores editados en UI.
 * @returns {{ crear: Array<{ idOrden: string, resultado: string, interpretacion: string }>, actualizar: Array<{ idOrden: string, resultado: string, interpretacion: string }> }} Operaciones de creación y actualización requeridas.
 */
export function cambiosDeResultados(vigentes, resultadosBorrador) {
  const crear = [];
  const actualizar = [];
  const resultados = resultadosBorrador || {};

  for (const o of vigentes || []) {
    if (!o.idPpe) continue;
    const k = clave(o.idPpe);
    const datosBorrador = resultados[k] || resultados[o.idPpe] || {};
    const resBorrador = textoOGenerico(datosBorrador.resultado);
    const interpBorrador = textoOGenerico(datosBorrador.interpretacion);

    if (!o.resultado) {
      if (resBorrador !== "" || interpBorrador !== "") {
        crear.push({
          idOrden: o.idOrden,
          resultado: resBorrador,
          interpretacion: interpBorrador,
        });
      }
    } else {
      const resPrevio = textoOGenerico(o.resultado.resultado);
      const interpPrevia = textoOGenerico(o.resultado.interpretacion);
      if (resBorrador !== resPrevio || interpBorrador !== interpPrevia) {
        actualizar.push({
          idOrden: o.idOrden,
          resultado: resBorrador,
          interpretacion: interpBorrador,
        });
      }
    }
  }

  return { crear, actualizar };
}

/**
 * Genera el texto del aviso informativo cuando se desmarcan exámenes de una orden
 * (soporta tanto una cantidad numérica como un arreglo de nombres/elementos).
 *
 * @param {number|string[]} cantidad - Número entero o lista de exámenes quitados.
 * @returns {string|null} Mensaje formateado en singular/plural o `null` si no hubo elementos quitados.
 */
export function mensajeExamenesQuitados(cantidad) {
  if (Array.isArray(cantidad)) {
    if (cantidad.length === 0) return null;
    const n = cantidad.length;
    const nombre = n === 1 ? "examen" : "exámenes";
    return `Se ha quitado ${n} ${nombre} de la selección.`;
  }
  if (!Number.isInteger(cantidad) || cantidad <= 0) return null;
  const nombre = cantidad === 1 ? "examen" : "exámenes";
  return `Se ha quitado ${cantidad} ${nombre} de la selección.`;
}

/**
 * Genera el mensaje de advertencia para confirmar el avance o cierre cuando existen
 * órdenes de examen sin resultados capturados.
 *
 * @param {number} cantidad - Cantidad de exámenes pendientes de resultado.
 * @returns {string|null} Mensaje de confirmación o `null` si `cantidad` no es un entero positivo.
 */
export function mensajeResultadosPendientes(cantidad) {
  if (!Number.isInteger(cantidad) || cantidad <= 0) return null;
  const nombre = cantidad === 1 ? "examen" : "exámenes";
  return `Hay ${cantidad} ${nombre} sin resultado. ¿Desea continuar de todos modos?`;
}

/**
 * Edad en años cumplidos en UTC.
 * @param {string|number|Date|null|undefined} fechaNacimiento
 * @param {Date} [hoy]
 * @returns {number|null}
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
 * Determina el paso activo al abrir la consulta.
 * @param {string[]} orden
 * @param {Record<string,string>|Map<string,string>} estados
 * @returns {string|null}
 */
export function pasoActual(orden, estados) {
  const estadoDe = (id) =>
    parsearEstado(estados instanceof Map ? estados.get(id) : estados[id]);
  return (
    (orden || []).find((id) => estadoDe(id) === Estado.EN_CURSO) ??
    (orden || []).find((id) => estadoDe(id) !== Estado.FINALIZADO) ??
    null
  );
}