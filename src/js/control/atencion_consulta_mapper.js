import { leerPaso } from "./observaciones_service.js";
import {
  Estado,
  aEstadoVisual,
  parsearEstado,
  puedeEditar,
  puedeAvanzar,
  puedeRetroceder,
  puedeFinalizar,
  puedeFinalizarConsulta,
} from "./estado_paso.js";
import { calcularEdad } from "./reglas_consulta.js";

/** Normaliza un id para compararlo (minúsculas, nunca null). */
const clave = (id) => String(id ?? "").toLowerCase();

/** Extrae el UUID de un idPersonaRol ya sea string u objeto anidado. */
function obtenerIdRol(valor) {
  if (!valor) return null;
  if (typeof valor === "string") return clave(valor);
  if (typeof valor === "object") {
    return clave(valor.idPersonaRol ?? valor.id ?? null);
  }
  return clave(valor);
}

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
    .sort((x, y) =>
      String(x.nombre ?? "").localeCompare(String(y.nombre ?? "")),
    );

  console.table(
    [...(e.procedimientosPorId?.values() ?? [])].map((proc) => {
      const fila = proc.filaPor.get(proc.idActual);
      return {
        nombre: proc.nombreProcedimiento,
        completa: proc.completa,
        idActual: proc.idActual,
        estadoPaso: fila?.estado,
        responsable: obtenerIdRol(fila?.idPersonaRol),
        empleado: obtenerIdRol(e.idPersonaRolEmpleado),
      };
    }),
  );

  // FILTRADO ESTRICTO: Solo mostrar procedimientos cuyo paso actual pertenezca al usuario de turno o ya estén finalizados
  const procedimientos = [...(e.procedimientosPorId?.values() ?? [])]
    .map((proc, idx) => {
      const completados = proc.orden.filter(
        (idPaso) =>
          parsearEstado(proc.filaPor.get(idPaso)?.estado) === Estado.FINALIZADO,
      ).length;
      return {
        idConsultaProcedimiento: proc.cp.idConsultaProcedimiento,
        idProcedimiento: proc.idProcedimiento,
        nombre: proc.nombreProcedimiento || `Procedimiento ${idx + 1}`,
        completa: proc.completa,
        pasosCompletados: completados,
        totalPasos: proc.orden.length,
        activo: proc.cp.idConsultaProcedimiento === e.idCpActivo,
        propio: esProcedimientoPropio(proc, e.idPersonaRolEmpleado),
      };
    })
    // Los ajenos ni siquiera salen del servicio; el activo siempre se conserva.
    .filter((p) => p.activo || p.propio);

  const quedanOtrosProcedimientos = procedimientos.some(
    (proc) => !proc.activo && !proc.completa,
  );

  return {
    completa: e.completa,
    consultaCompleta: Boolean(e.consultaCompleta),
    consultaFinalizada: Boolean(e.consultaFinalizada),
    puedeFinalizarConsulta: puedeFinalizarConsulta(
      e.consultaCompleta,
      e.consultaFinalizada,
    ),
    idConsultaProcedimientoActivo: e.idCpActivo,
    procedimientos,
    quedanOtrosProcedimientos,
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
      puedeFinalizarProcedimiento: puedeFinalizar(estado, haySiguiente),
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

/** El procedimiento está "En curso" en su paso actual y ese paso es del empleado de la sesión. */
export function esProcedimientoPropio(proc, idPersonaRolEmpleado) {
  const idEmpleado = obtenerIdRol(idPersonaRolEmpleado);
  if (!idEmpleado) return false;
  const fila = proc.filaPor.get(proc.idActual);
  return (
    parsearEstado(fila?.estado) !== Estado.FINALIZADO &&
    obtenerIdRol(fila?.idPersonaRol) === idEmpleado
  );
}
