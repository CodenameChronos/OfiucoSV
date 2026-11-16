import OrdenExamen from "../entity/orden_examen.js";
import ExamenResultado from "../entity/examen_resultado.js";
import { escribirPaso, leerPaso } from "./observaciones_codec.js";
import { escribirIds } from "./indicaciones_codec.js";
import { cambiosDeResultados } from "./atencion_reglas.js";

const texto = (v) => String(v ?? "").trim();

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

async function guardarNotas(f, e, ids, notas) {
  const actual = leerPaso(e.cp.observaciones, e.idActual)?.notas ?? "";
  if (texto(notas) === texto(actual)) return;
  const svc = f.consultaProcedimiento(ids.idConsulta);
  const fresco = await svc.findById(e.cp.idConsultaProcedimiento);
  fresco.observaciones = escribirPaso(fresco.observaciones, e.idActual, {
    notas,
  });
  await svc.update(fresco.idConsultaProcedimiento, fresco);
  e.cp = fresco;
}

async function guardarReferencia(f, e, ids, valor) {
  const nueva = texto(valor) || null;
  if (nueva === (texto(e.consulta.referenciaExterna) || null)) return;
  const svc = f.consulta(ids.idPersonaRol);
  const fresca = await svc.findById(ids.idConsulta);
  const actualizada = fresca.con({ referenciaExterna: nueva });
  await svc.update(fresca.idConsulta, actualizada);
  e.consulta = actualizada;
}

function obtenerOrdenesInfo(e) {
  // Lógica auxiliar para calcular información rápida de órdenes
  return e.ordenes.map((o) => {
    const r = e.resultados.get(o.idOrdenExamen)?.[0] ?? null;
    return {
      idOrden: o.idOrdenExamen,
      indicaciones: o.indicaciones,
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
