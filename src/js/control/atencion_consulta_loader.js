import Persona from "../entity/persona.js";
import { ordenar } from "./secuencia_service.js";
import { pasoActual } from "./reglas_consulta.js";

export async function cargarDatosAtencion(f, ids, abrirPasoCallback) {
  const { idPersonaRol, idConsulta } = ids;

  const consulta = await f.consulta(idPersonaRol).findById(idConsulta);
  const cps = await f.consultaProcedimiento(idConsulta).findAll();
  if (cps.length === 0) {
    throw new Error("La consulta no tiene un procedimiento asociado");
  }
  const cp = cps[0];
  const idProcedimiento = cp.idDeProcedimiento();
  if (!idProcedimiento) {
    throw new Error("El procedimiento de la consulta no tiene id");
  }

  const [filas, pasosProc, secuencias, paciente, examenes] = await Promise.all([
    f.consultaProcedimientoPaso(cp.idConsultaProcedimiento).findAll(),
    f.procedimientoPaso(idProcedimiento).findAll(),
    f.secuencia(idProcedimiento).findAll(),
    _cargarPaciente(f, consulta),
    f.examen().findAll(),
  ]);

  const orden = ordenar(
    pasosProc.map((p) => p.idProcedimientoPaso),
    secuencias.map((s) => ({
      paso: s.idDeProcedimientoPaso(),
      referencia: s.idDeProcedimientoPasoReferencia(),
    })),
  );
  if (orden.length === 0) {
    throw new Error("El procedimiento no tiene pasos");
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
  const completa = idEnCurso === null;
  const idActual = idEnCurso ?? orden[orden.length - 1];

  const estadoContexto = {
    consulta,
    cp,
    idProcedimiento,
    paciente,
    orden,
    nombres: new Map(pasosProc.map((p) => [p.idProcedimientoPaso, p.nombre])),
    filaPor,
    idActual,
    completa,
    nombreExamen: new Map(examenes.map((x) => [x.idExamen, x.nombre])),
    ordenes: [],
    resultados: new Map(),
    asignables: [],
    nombrePorPpe: new Map(),
  };

  if (!completa) await abrirPasoCallback(idActual, estadoContexto);
  await _cargarOrdenes(f, estadoContexto);
  await _cargarAsignables(f, estadoContexto);

  return estadoContexto;
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
