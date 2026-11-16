import { leerPaso } from "./observaciones_service.js";
import {
  Estado,
  aEstadoVisual,
  puedeEditar,
  puedeAvanzar,
  puedeRetroceder,
  puedeFinalizar,
} from "./estado_paso.js";
import { calcularEdad } from "./reglas_consulta.js";

export function construirVista(e, contextoPasoFn, ordenesInfoFn) {
  const { estado, haySiguiente, hayAnterior } = contextoPasoFn();
  const p = e.paciente;
  const info = ordenesInfoFn();
  const ordenadosIds = new Set(info.map((o) => o.idPpe).filter(Boolean));

  const examenes = e.asignables
    .map((a) => {
      const id = a.idProcedimientoPasoExamen;
      return {
        idProcedimientoPasoExamen: id,
        idExamen: a.idDeExamen(),
        nombre: e.nombrePorPpe.get(id.toLowerCase()),
        ordenado: ordenadosIds.has(id.toLowerCase()),
      };
    })
    .sort((x, y) => x.nombre.localeCompare(y.nombre));

  return {
    completa: e.completa,
    paciente: {
      idPersona: p.idPersona,
      nombres: p.nombres,
      apellidos: p.apellidos,
      nombreCompleto: [p.nombres, p.apellidos].filter(Boolean).join(" "),
      fechaNacimiento: p.fechaNacimiento,
      edad: calcularEdad(p.fechaNacimiento),
    },
    referenciaExterna: e.consulta.referenciaExterna ?? "",
    pasos: e.orden.map((id) => {
      const fila = e.filaPor.get(id);
      return {
        id,
        nombre: e.nombres.get(id),
        estado: fila?.estado ?? Estado.CREADO,
        estadoVisual: aEstadoVisual(fila?.estado),
        actual: id === e.idActual,
      };
    }),
    paso: {
      id: e.idActual,
      nombre: e.nombres.get(e.idActual),
      numero: e.orden.indexOf(e.idActual) + 1,
      total: e.orden.length,
      estado,
      editable: puedeEditar(estado),
      puedeAvanzar: puedeAvanzar(estado, haySiguiente),
      puedeRetroceder: puedeRetroceder(estado, hayAnterior),
      puedeFinalizar: puedeFinalizar(estado, haySiguiente),
    },
    notas: leerPaso(e.cp.observaciones, e.idActual)?.notas ?? "",
    examenes,
    ordenes: info
      .filter((o) => o.idPpe)
      .map((o) => ({
        idOrdenExamen: o.idOrden,
        idProcedimientoPasoExamen: o.idPpe,
        nombre: e.nombrePorPpe.get(o.idPpe) ?? "Examen",
        resultado: o.resultado
          ? {
              idExamenResultado: o.resultado.id,
              resultado: o.resultado.resultado ?? "",
              interpretacion: o.resultado.interpretacion ?? "",
            }
          : null,
      })),
  };
}
