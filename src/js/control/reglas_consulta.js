/**
 * @file Reglas de la pantalla de atención (HU4), como funciones puras.
 * Trabajan con formas simples ({id, ...}) y no con las entities: el service
 * es quien convierte las entities (con sus relaciones anidadas) a estas
 * formas, de modo que estas reglas no dependen del JSON del backend.
 */
import { leerIds, escribirIds } from "./indicaciones_service.js";
import { Estado, parsearEstado } from "./estado_paso.js";

/** Normaliza un id para compararlo (minúsculas, nunca null). */
export const clave = (id) => String(id ?? "").toLowerCase();

const texto = (valor) => typeof valor === "string" && valor.trim() !== "";
const textoOGenerico = (v) => String(v ?? "");

/**
 * UUID de los exámenes que ya tienen orden en este paso.
 * @param {{indicaciones: string|null}[]} ordenes órdenes del paso actual
 * @returns {string[]}
 */
export function idsOrdenados(ordenes) {
  return leerIds((ordenes || []).map((o) => o?.indicaciones ?? "").join("\n"));
}

/**
 * De los exámenes marcados por el médico, los que todavía no tienen orden.
 * @param {string[]} seleccionados UUID de procedimiento_paso_examen marcados
 * @param {{indicaciones: string|null}[]} ordenes órdenes ya existentes del paso
 * @returns {string[]}
 */
export function examenesPorOrdenar(seleccionados, ordenes) {
  const yaOrdenados = new Set(idsOrdenados(ordenes));
  return leerIds(escribirIds(seleccionados || [])).filter(
    (id) => !yaOrdenados.has(id),
  );
}

/**
 * Órdenes que no tienen ningún resultado con texto.
 * @param {{id: string}[]} ordenes
 * @param {{idOrden: string, resultado: string|null}[]} resultados
 * @returns {string[]} ids de las órdenes sin resultado
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
 * Planifica qué exámenes crear y cuáles quitar comparando la selección del borrador
 * con las órdenes existentes del paso.
 * @param {string[]} seleccionadosBorrador IDs de PPE seleccionados en el borrador.
 * @param {{id: string, indicaciones: string|null, tieneResultado: boolean}[]} ordenesExistentes
 * @returns {{crear: string[], quitar: {idOrden: string, idPpe: string, tieneResultado: boolean}[]}}
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
 * Detecta qué resultados deben crearse o actualizarse comparando las órdenes vigentes
 * con los resultados actuales del borrador.
 * @param {{idOrden: string, idPpe: string, resultado: {id: string, resultado: string, interpretacion: string}|null}[]} vigentes
 * @param {Record<string, {resultado?: string, interpretacion?: string}>} resultadosBorrador
 * @returns {{crear: {idOrden: string, resultado: string, interpretacion: string}[], actualizar: {idOrden: string, resultado: string, interpretacion: string}[]}}
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
 * Texto del aviso cuando se quitan exámenes (soporta tanto números como arrays de nombres).
 * @param {number|string[]} cantidad número o lista de exámenes quitados
 * @returns {string|null}
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
 * Texto del aviso de confirmación de resultados pendientes.
 * @param {number} cantidad
 * @returns {string|null}
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
