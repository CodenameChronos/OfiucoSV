import Persona from "../entity/persona.js";
import { ordenar } from "./secuencia_service.js";
import { pasoActual } from "./reglas_consulta.js";

export async function cargarDatosAtencion(
  f,
  ids,
  abrirPasoCallback,
  idCpPreferido = null,
) {
  const { idPersonaRol, idConsulta } = ids;

  const consulta = await f.consulta(idPersonaRol).findById(idConsulta);
  const cps = await f.consultaProcedimiento(idConsulta).findAll();
  if (cps.length === 0) {
    throw new Error("La consulta no tiene procedimientos asociados");
  }

  // Ordenar por fechaInicio ascendente si existe
  cps.sort((a, b) => {
    const fa = a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0;
    const fb = b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0;
    return fa - fb;
  });

  const [paciente, examenes] = await Promise.all([
    _cargarPaciente(f, consulta),
    f.examen().findAll(),
  ]);

  const nombreExamen = new Map(examenes.map((x) => [x.idExamen, x.nombre]));
  const procedimientosPorId = new Map();

  for (const cp of cps) {
    const idProcedimiento = cp.idDeProcedimiento();
    if (!idProcedimiento) {
      throw new Error("Uno de los procedimientos de la consulta no tiene id");
    }

    const [filas, pasosProc, secuencias] = await Promise.all([
      f.consultaProcedimientoPaso(cp.idConsultaProcedimiento).findAll(),
      f.procedimientoPaso(idProcedimiento).findAll(),
      f.secuencia(idProcedimiento).findAll(),
    ]);

    const orden = ordenar(
      pasosProc.map((p) => p.idProcedimientoPaso),
      secuencias.map((s) => ({
        paso: s.idDeProcedimientoPaso(),
        referencia: s.idDeProcedimientoPasoReferencia(),
      })),
    );
    if (orden.length === 0) {
      throw new Error("Uno de los procedimientos no tiene pasos configurados");
    }

    const filaPor = new Map();
    for (const fila of filas) {
      const id = fila.idDeProcedimientoPaso();
      if (id && !filaPor.has(id)) filaPor.set(id, fila);
    }
    const estados = Object.fromEntries(
      [...filaPor].map(([id, fila]) => [id, fila.estado]),
    );

    const idEnCurso = pasoActual(orden, estados);
    const completa = idEnCurso === null || cp.fechaFin != null;
    const idActual = idEnCurso ?? orden[orden.length - 1];

    procedimientosPorId.set(cp.idConsultaProcedimiento, {
      cp,
      idProcedimiento,
      nombreProcedimiento:
        cp.idProcedimiento?.nombre ?? cp.nombre ?? "Procedimiento",
      orden,
      nombres: new Map(pasosProc.map((p) => [p.idProcedimientoPaso, p.nombre])),
      filaPor,
      idActual,
      completa,
    });
  }

  // Elegir el procedimiento preferido, o el primero incompleto, o el último
  const listaProcs = [...procedimientosPorId.values()];
  const seleccionado =
    (idCpPreferido && procedimientosPorId.get(idCpPreferido)) ||
    listaProcs.find((p) => !p.completa) ||
    listaProcs[listaProcs.length - 1];

  const estadoContexto = {
    consulta,
    paciente,
    nombreExamen,
    procedimientosPorId,
    idCpActivo: seleccionado.cp.idConsultaProcedimiento,
    // Alias apuntando al procedimiento activo para mantener compatibilidad
    cp: seleccionado.cp,
    idProcedimiento: seleccionado.idProcedimiento,
    orden: seleccionado.orden,
    nombres: seleccionado.nombres,
    filaPor: seleccionado.filaPor,
    idActual: seleccionado.idActual,
    completa: seleccionado.completa,
    consultaCompleta: listaProcs.every((p) => p.completa),
    ordenes: [],
    resultados: new Map(),
    asignables: [],
    nombrePorPpe: new Map(),
  };

  if (!estadoContexto.completa) {
    await abrirPasoCallback(estadoContexto.idActual, estadoContexto);
  }
  await _cargarOrdenes(f, estadoContexto);
  await _cargarAsignables(f, estadoContexto);

  return estadoContexto;
}

export async function _activarProcedimientoEnContexto(
  f,
  e,
  idConsultaProcedimiento,
  abrirPasoCallback,
) {
  const proc = e.procedimientosPorId.get(idConsultaProcedimiento);
  if (!proc) {
    throw new Error("El procedimiento indicado no pertenece a esta consulta");
  }
  e.idCpActivo = idConsultaProcedimiento;
  e.cp = proc.cp;
  e.idProcedimiento = proc.idProcedimiento;
  e.orden = proc.orden;
  e.nombres = proc.nombres;
  e.filaPor = proc.filaPor;
  e.idActual = proc.idActual;
  e.completa = proc.completa;

  if (!e.completa) {
    await abrirPasoCallback(e.idActual, e);
  }
  await _cargarOrdenes(f, e);
  await _cargarAsignables(f, e);
}

async function _cargarPaciente(f, consulta) {
  const p = consulta.paciente;
  if (p && typeof p === "object" && p.nombres != null) {
    return new Persona(p);
  }
  const idPersona = typeof p === "string" ? p : p?.idPersona;
  if (!idPersona) {
    throw new Error("No se pudo determinar el paciente de la consulta");
  }
  return f.persona().findById(idPersona);
}

export async function _cargarOrdenes(f, e) {
  const fila = e.filaPor.get(e.idActual);
  e.ordenes = fila
    ? await f.ordenExamen(fila.idConsultaProcedimientoPaso).findAll()
    : [];
  const listas = await Promise.all(
    e.ordenes.map((o) => f.resultado(o.idOrdenExamen).findAll()),
  );
  e.resultados = new Map(e.ordenes.map((o, i) => [o.idOrdenExamen, listas[i]]));
}

export async function _cargarAsignables(f, e) {
  e.asignables = await f.examenesDelPaso(e.idProcedimiento, e.idActual);
  e.nombrePorPpe = new Map(
    e.asignables.map((a) => [
      a.idProcedimientoPasoExamen.toLowerCase(),
      e.nombreExamen.get(a.idDeExamen()) ?? "Examen",
    ]),
  );
}
