import Persona from "../entity/persona.js";
import { ordenar } from "./secuencia_service.js";
import { pasoActual } from "./reglas_consulta.js";

/**
 * Carga todo el contexto de atención de una consulta.
 *
 * Pasos principales:
 *  1. Lee la consulta y sus procedimientos (ordenados por `fechaInicio`
 *     ascendente; los que no tienen fecha van primero).
 *  2. Carga al paciente y el catálogo de exámenes en paralelo.
 *  3. Por cada procedimiento calcula el orden de sus pasos, el paso en
 *     curso y si está completo.
 *  4. Elige el procedimiento activo: el preferido, si no el primero
 *     incompleto y, si todos están completos, el último.
 *  5. Si el procedimiento activo no está completo, invoca
 *     `abrirPasoCallback` para abrir/iniciar su paso actual.
 *  6. Carga órdenes, resultados y exámenes asignables del paso actual.
 *
 * @param {FabricaRepositorios} f Fábrica de repositorios.
 * @param {IdsAtencion} ids Ids de la consulta y de su persona_rol.
 * @param {(idPaso: string, contexto: EstadoContexto) => Promise<void>} abrirPasoCallback
 *   Se llama con el paso actual y el contexto, solo si el procedimiento activo no está completo.
 * @param {string|null} [idCpPreferido=null] `idConsultaProcedimiento` que se quiere activar si existe.
 * @returns {Promise<EstadoContexto>} Contexto completo y listo para la pantalla.
 * @throws {Error} Si la consulta no tiene procedimientos, un procedimiento no
 *   tiene id, un procedimiento no tiene pasos configurados, o no se puede
 *   determinar al paciente.
 */
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
      const id =
        typeof fila.idDeProcedimientoPaso === "function"
          ? fila.idDeProcedimientoPaso()
          : typeof fila.idProcedimientoPaso === "object" &&
              fila.idProcedimientoPaso !== null
            ? (fila.idProcedimientoPaso.idProcedimientoPaso ??
              fila.idProcedimientoPaso.id)
            : fila.idProcedimientoPaso;

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
    // Todos los procedimientos finalizados (la consulta ya puede cerrarse)...
    consultaCompleta: listaProcs.every((p) => p.completa),
    // ...y la consulta efectivamente cerrada (consulta.fecha_fin).
    consultaFinalizada: consulta.fechaFin != null,
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

/**
 * Cambia el procedimiento activo del contexto (MUTA `e`).
 *
 * Reasigna los alias (`cp`, `orden`, `idActual`, etc.) con los datos del
 * procedimiento indicado, abre su paso actual si no está completo y
 * recarga órdenes, resultados y asignables.
 *
 * @param {FabricaRepositorios} f Fábrica de repositorios.
 * @param {EstadoContexto} e Contexto a modificar.
 * @param {string} idConsultaProcedimiento Procedimiento que se quiere activar.
 * @param {(idPaso: string, contexto: EstadoContexto) => Promise<void>} abrirPasoCallback
 *   Se llama solo si el procedimiento activado no está completo.
 * @returns {Promise<void>}
 * @throws {Error} Si el procedimiento no pertenece a la consulta cargada.
 */
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

/**
 * Obtiene el origen del paciente a partir de la consulta.
 *
 * Según el esquema, el paciente es `persona_rol.id_persona` del persona_rol
 * de la consulta; `consulta.paciente` solo se usa de respaldo (por si el
 * backend ya entrega al paciente resuelto).
 *
 * @param {Object} consulta Entidad de la consulta.
 * @returns {Object|string|undefined} Persona (objeto o id) o `undefined` si no hay origen.
 */
function origenPaciente(consulta) {
  const rol = consulta?.idPersonaRol;
  if (rol !== null && typeof rol === "object" && rol.idPersona != null) {
    return rol.idPersona;
  }
  return consulta?.paciente;
}

/**
 * Resuelve al paciente de la consulta como entidad {@link Persona}.
 *
 * - Si el origen ya es un objeto con `nombres`, lo envuelve en `Persona`
 *   sin consultar al servidor.
 * - Si solo hay un id (texto u objeto con `idPersona`), lo busca con
 *   `f.persona().findById`.
 *
 * @param {FabricaRepositorios} f Fábrica de repositorios.
 * @param {Object} consulta Entidad de la consulta.
 * @returns {Promise<Persona>}
 * @throws {Error} Si no se puede determinar el paciente.
 */
async function _cargarPaciente(f, consulta) {
  const p = origenPaciente(consulta);
  if (p && typeof p === "object" && p.nombres != null) {
    return new Persona(p);
  }
  const idPersona = typeof p === "string" ? p : p?.idPersona;
  if (!idPersona) {
    throw new Error("No se pudo determinar el paciente de la consulta");
  }
  return f.persona().findById(idPersona);
}

/**
 * Carga las órdenes de examen del paso actual y sus resultados (MUTA `e`).
 *
 * Rellena `e.ordenes` (vacío si el paso no tiene fila de avance) y
 * `e.resultados` (mapa `idOrdenExamen` → lista de resultados). Los
 * resultados de todas las órdenes se piden en paralelo.
 *
 * @param {FabricaRepositorios} f Fábrica de repositorios.
 * @param {EstadoContexto} e Contexto a modificar.
 * @returns {Promise<void>}
 */
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

/**
 * Carga los exámenes asignables del paso actual (MUTA `e`).
 *
 * Rellena:
 *  - `e.asignables`: exámenes del paso, filtrando los que pertenecen a otro
 *    procedimiento. Si el servicio no trae el procedimiento asociado, el
 *    examen se acepta (se confía en que `examenesDelPaso` ya lo filtró).
 *  - `e.nombrePorPpe`: nombre del examen por `idProcedimientoPasoExamen`
 *    en minúsculas ("Examen" si no está en el catálogo).
 *
 * @param {FabricaRepositorios} f Fábrica de repositorios.
 * @param {EstadoContexto} e Contexto a modificar.
 * @returns {Promise<void>}
 */
export async function _cargarAsignables(f, e) {
  const todosLosAsignables = await f.examenesDelPaso(
    e.idProcedimiento,
    e.idActual,
  );

  // FILTRADO ESTRICTO: Asegurar que el examen pertenezca al idProcedimiento del contexto actual
  e.asignables = todosLosAsignables.filter((a) => {
    const procAsociado =
      typeof a.idProcedimiento === "object"
        ? a.idProcedimiento?.idProcedimiento
        : a.idProcedimiento;
    // Si el servicio no trae el idProcedimiento anidado, lo validamos mediante el mapeo del paso actual
    return (
      !procAsociado ||
      String(procAsociado).toLowerCase() ===
        String(e.idProcedimiento).toLowerCase()
    );
  });

  e.nombrePorPpe = new Map(
    e.asignables.map((a) => [
      a.idProcedimientoPasoExamen.toLowerCase(),
      e.nombreExamen.get(a.idDeExamen()) ?? "Examen",
    ]),
  );
}
