import OrdenExamen from "../entity/ordenExamen.js";
import ExamenResultado from "../entity/examenResultado.js";
import { escribirPaso, leerPaso } from "./observaciones_service.js";
import { escribirIds, leerIds } from "./indicaciones_service.js";
import { cambiosDeResultados } from "./reglas_consulta.js";

/**
 * Convierte cualquier valor a texto sin espacios en los extremos.
 * Se usa para comparar texto ignorando espacios sobrantes.
 *
 * @param {*} v
 * @returns {string}
 */
const texto = (v) => String(v ?? "").trim();

/**
 * Persiste los cambios del borrador para el paso actual.
 *
 * Solo escribe lo que cambió: las notas y la referencia externa se omiten si
 * son `undefined` o iguales a lo guardado; los resultados se comparan con
 * `cambiosDeResultados`, que decide cuáles crear y cuáles actualizar.
 * Las órdenes que se quitan se borran en cascada (resultados primero).
 *
 * MUTA `e`: actualiza `e.cp`, `e.consulta`, `e.ordenes` y `e.resultados`.
 *
 * @param {FabricaRepositorios} f Fábrica de repositorios.
 * @param {EstadoContexto} e Contexto de atención (se modifica).
 * @param {{idPersonaRol: string, idConsulta: string}} ids Ids de la consulta cargada.
 * @param {BorradorNormalizado} b Borrador ya normalizado.
 * @param {PlanSeleccion} plan Plan de cambios sobre las órdenes.
 * @param {() => string} ahoraFn Devuelve la fecha/hora actual en ISO 8601 (para `fechaCreacion`).
 * @returns {Promise<void>}
 * @throws {TypeError} Si el paso actual no tiene fila de avance (`e.filaPor` no contiene `e.idActual`).
 */
export async function escribirCambiosAtencion(f, e, ids, b, plan, ahoraFn) {
  if (b.notas !== undefined) await guardarNotas(f, e, ids, b.notas);
  if (b.referenciaExterna !== undefined)
    await guardarReferencia(f, e, ids, b.referenciaExterna);

  const fila = e.filaPor.get(e.idActual);
  const svcOrden = f.ordenExamen(fila.idConsultaProcedimientoPaso);

  for (const idPpe of plan.crear) {
    await svcOrden.create(
      new OrdenExamen({
        fechaCreacion: ahoraFn(),
        indicaciones: escribirIds([idPpe]),
        idConsultaProcedimientoPaso: fila.idConsultaProcedimientoPaso,
      }),
    );
  }
  if (plan.crear.length > 0) {
    // Recargar órdenes tras crear nuevas
    await recargarOrdenesInterno(f, e);
  }

  const aQuitar = new Set(plan.quitar.map((q) => q.idOrden));
  const vigentes = obtenerOrdenesInfo(e).filter(
    (o) => o.idPpe && !aQuitar.has(o.idOrden),
  );
  const { crear, actualizar } = cambiosDeResultados(vigentes, b.resultados);

  for (const c of crear) {
    await f.resultado(c.idOrden).create(
      new ExamenResultado({
        fechaCreacion: ahoraFn(),
        resultado: c.resultado,
        interpretacion: c.interpretacion,
        idOrdenExamen: c.idOrden,
      }),
    );
  }

  for (const c of actualizar) {
    const existente = e.resultados.get(c.idOrden)[0];
    existente.resultado = c.resultado;
    existente.interpretacion = c.interpretacion;
    await f.resultado(c.idOrden).update(existente.idExamenResultado, existente);
  }

  // Borrado seguro en cascada (resultados primero, luego órdenes)
  for (const q of plan.quitar) {
    for (const r of e.resultados.get(q.idOrden) ?? []) {
      await f.resultado(q.idOrden).delete(r.idExamenResultado);
    }
    await svcOrden.delete(q.idOrden);
  }
}

/**
 * Guarda las notas del paso actual dentro de las observaciones del
 * procedimiento (`consultaProcedimiento.observaciones`).
 *
 * No hace nada si las notas no cambiaron (comparadas sin espacios en los
 * extremos). Antes de escribir vuelve a leer el procedimiento del servidor
 * para no pisar cambios ajenos, y deja la entidad fresca en el contexto
 * (`e.cp` y la copia dentro de `e.procedimientosPorId`).
 *
 * MUTA `e`.
 *
 * @param {FabricaRepositorios} f
 * @param {EstadoContexto} e
 * @param {{idConsulta: string}} ids
 * @param {string} notas Nuevas notas del paso actual.
 * @returns {Promise<void>}
 */
async function guardarNotas(f, e, ids, notas) {
  const actual = leerPaso(e.cp.observaciones, e.idActual)?.notas ?? "";
  if (texto(notas) === texto(actual)) return;
  const svc = f.consultaProcedimiento(ids.idConsulta);
  const fresco = await svc.findById(e.cp.idConsultaProcedimiento);
  fresco.idConsulta = ids.idConsulta;
  fresco.idProcedimiento = e.idProcedimiento;
  fresco.observaciones = escribirPaso(fresco.observaciones, e.idActual, {
    notas,
  });
  await svc.update(fresco.idConsultaProcedimiento, fresco);
  e.cp = fresco;
  const proc = e.procedimientosPorId?.get(fresco.idConsultaProcedimiento);
  if (proc) proc.cp = fresco;
}

/**
 * Guarda la referencia externa de la consulta.
 *
 * Un texto vacío se guarda como `null`. No hace nada si el valor (normalizado)
 * es igual al actual. Relee la consulta del servidor antes de actualizar y
 * deja la versión nueva en `e.consulta`.
 *
 * MUTA `e`.
 *
 * @param {FabricaRepositorios} f
 * @param {EstadoContexto} e
 * @param {{idPersonaRol: string, idConsulta: string}} ids
 * @param {string} valor Nueva referencia externa.
 * @returns {Promise<void>}
 */
async function guardarReferencia(f, e, ids, valor) {
  const nueva = texto(valor) || null;
  if (nueva === (texto(e.consulta.referenciaExterna) || null)) return;
  const svc = f.consulta(ids.idPersonaRol);
  const fresca = await svc.findById(ids.idConsulta);
  const actualizada = fresca.con({ referenciaExterna: nueva });
  await svc.update(fresca.idConsulta, actualizada);
  e.consulta = actualizada;
}

/**
 * Resume las órdenes en memoria del paso actual junto con su primer
 * resultado. Cada orden guarda en `indicaciones` el id del examen (`idPpe`).
 *
 * @param {EstadoContexto} e
 * @returns {OrdenInfo[]}
 */
function obtenerOrdenesInfo(e) {
  // Lógica auxiliar para calcular información rápida de órdenes
  return e.ordenes.map((o) => {
    const r = e.resultados.get(o.idOrdenExamen)?.[0] ?? null;
    return {
      idOrden: o.idOrdenExamen,
      indicaciones: o.indicaciones,
      idPpe: leerIds(o.indicaciones)[0] ?? null,
      resultado: r
        ? {
            id: r.idExamenResultado,
            resultado: r.resultado,
            interpretacion: r.interpretacion,
          }
        : null,
    };
  });
}

/**
 * Vuelve a leer del servidor las órdenes del paso actual y sus resultados
 * (MUTA `e`). Se usa tras crear órdenes nuevas para conocer sus ids.
 *
 * @param {FabricaRepositorios} f
 * @param {EstadoContexto} e
 * @returns {Promise<void>}
 */
async function recargarOrdenesInterno(f, e) {
  // Versión interna ligera para refrescar e.ordenes y e.resultados
  const fila = e.filaPor.get(e.idActual);
  e.ordenes = fila
    ? await f.ordenExamen(fila.idConsultaProcedimientoPaso).findAll()
    : [];
  const listas = await Promise.all(
    e.ordenes.map((o) => f.resultado(o.idOrdenExamen).findAll()),
  );
  e.resultados = new Map(e.ordenes.map((o, i) => [o.idOrdenExamen, listas[i]]));
}
