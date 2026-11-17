import ConsultaService from "./consulta_service.js";
import ConsultaProcedimientoService from "./consultaProcedimiento_service.js";
import ConsultaProcedimientoPasoService from "./consultaProcedimientoPaso_service.js";
import ProcedimientoPasoService from "./procedimientoPaso_service.js";
import ProcedimientoPasoSecuenciaService from "./procedimientoPasoSecuencia_service.js";
import OrdenExamenService from "./ordenExamen_service.js";
import ExamenResultadoService from "./examenResultado_service.js";
import PersonaService from "./persona_service.js";
import ExamenService from "./examen_service.js";
import ProcedimientoPasoExamenService from "./procedimientoPasoExamen_service.js";
import PersonaRolService from "./personaRol_service.js";
import ConsultaProcedimientoPaso from "../entity/consultaProcedimientoPaso.js";
import { anterior, siguiente } from "./secuencia_service.js";
import {
  Estado,
  ErrorEstado,
  parsearEstado,
  puedeEditar,
  alAvanzar,
  alRetroceder,
  alFinalizar,
  alFinalizarConsulta,
} from "./estado_paso.js";
import { leerIds, escribirIds } from "./indicaciones_service.js";
import {
  fueAtendido,
  candidatosResponsable,
  elegirResponsable,
  idClinicaDeConsulta,
} from "./atencion_consulta_responsable.js";
import {
  ordenesSinResultado,
  mensajeResultadosPendientes,
  mensajeExamenesQuitados,
  planificarSeleccion,
} from "./reglas_consulta.js";
import {
  cargarDatosAtencion,
  _cargarOrdenes,
  _activarProcedimientoEnContexto,
} from "./atencion_consulta_loader.js";
import { escribirCambiosAtencion } from "./atencion_consulta_writter.js";
import { construirVista } from "./atencion_consulta_mapper.js";

export class ConfirmacionRequerida extends Error {
  constructor(mensaje, avisos = [mensaje]) {
    super(mensaje);
    this.name = "ConfirmacionRequerida";
    this.avisos = avisos;
  }
}

const FABRICA_POR_DEFECTO = {
  consulta: (idPersonaRol) => new ConsultaService(idPersonaRol),
  consultaProcedimiento: (idConsulta) =>
    new ConsultaProcedimientoService(idConsulta),
  consultaProcedimientoPaso: (idCPP) =>
    new ConsultaProcedimientoPasoService(idCPP),
  procedimientoPaso: (idProcedimiento) =>
    new ProcedimientoPasoService(idProcedimiento),
  secuencia: (idProcedimiento) =>
    new ProcedimientoPasoSecuenciaService(idProcedimiento),
  ordenExamen: (idCPP) => new OrdenExamenService(idCPP),
  resultado: (idOrden) => new ExamenResultadoService(idOrden),
  persona: () => new PersonaService(),
  examen: () => new ExamenService(),
  examenesDelPaso: (idProcedimiento, idPaso) =>
    new ProcedimientoPasoExamenService().listarPorProcedimientoPaso(
      idProcedimiento,
      idPaso,
    ),
  personalDeClinica: (idClinica) =>
    new PersonaRolService().listarPersonalDeClinica(idClinica),
  // persona_rol de una persona (para saber su clínica)
  personaRol: (idPersona) => new PersonaRolService(idPersona),
};

const tieneTexto = (resultado) =>
  Boolean(resultado) &&
  (String(resultado.resultado ?? "").trim() !== "" ||
    String(resultado.interpretacion ?? "").trim() !== "");

export default class AtencionService {
  #f;
  #idPersonaRolEmpleado;
  #ahora;
  #azar;
  #ids = null;
  #e = null;

  constructor({
    fabrica = {},
    idPersonaRolEmpleado = null,
    ahora = () => new Date().toISOString(),
    azar = Math.random,
  } = {}) {
    this.#f = { ...FABRICA_POR_DEFECTO, ...fabrica };
    this.#idPersonaRolEmpleado = idPersonaRolEmpleado;
    this.#ahora = ahora;
    this.#azar = azar;
  }

  async cargar({ idPersonaRol, idConsulta }, idCpPreferido = null) {
    this.#ids = { idPersonaRol, idConsulta };
    this.#e = await cargarDatosAtencion(
      this.#f,
      this.#ids,
      (id, estado) => this.#abrirPaso(id, estado),
      idCpPreferido,
    );
    return this.#vista();
  }

  async seleccionarProcedimiento(idConsultaProcedimiento) {
    const e = this.#exigirCarga();
    if (e.idCpActivo === idConsultaProcedimiento) return this.#vista();
    await _activarProcedimientoEnContexto(
      this.#f,
      e,
      idConsultaProcedimiento,
      (id, estado) => this.#abrirPaso(id, estado),
    );
    return this.#vista();
  }

  async guardarCambios(borrador, { confirmado = false } = {}) {
    this.#exigirCarga();
    this.#exigirEditable();
    const b = this.#normalizarBorrador(borrador);
    const plan = this.#planificar(b);
    this.#exigirConfirmacion(this.#avisos(b, plan, false), confirmado);

    await escribirCambiosAtencion(
      this.#f,
      this.#e,
      this.#ids,
      b,
      plan,
      this.#ahora,
    );
    await _cargarOrdenes(this.#f, this.#e);
    return this.#vista();
  }

  advertencias(borrador, { cerrando = false } = {}) {
    this.#exigirCarga();
    const b = this.#normalizarBorrador(borrador);
    return this.#avisos(b, this.#planificar(b), cerrando);
  }

  async avanzar(borrador, { confirmado = false } = {}) {
    const e = this.#exigirCarga();
    const { estado, haySiguiente } = this.#contextoPaso();
    alAvanzar(estado, haySiguiente);

    const b = this.#normalizarBorrador(borrador);
    const plan = this.#planificar(b);
    this.#exigirConfirmacion(this.#avisos(b, plan, true), confirmado);

    const idSiguiente = siguiente(e.orden, e.idActual);
    const responsable = await this.#responsableParaAbrir(idSiguiente, e);

    await escribirCambiosAtencion(this.#f, e, this.#ids, b, plan, this.#ahora);
    await this.#actualizarFila(e.idActual, {
      estado: Estado.FINALIZADO,
      fechaFin: this.#ahora(),
    });
    await this.#abrirPaso(idSiguiente, null, responsable);
    return this.cargar(this.#ids, e.idCpActivo);
  }

  async retroceder(borrador, { confirmado = false } = {}) {
    const e = this.#exigirCarga();
    const { estado, hayAnterior } = this.#contextoPaso();
    alRetroceder(estado, hayAnterior);

    const b = this.#normalizarBorrador(borrador);
    const plan = this.#planificar(b);
    this.#exigirConfirmacion(this.#avisos(b, plan, false), confirmado);

    await escribirCambiosAtencion(this.#f, e, this.#ids, b, plan, this.#ahora);
    await this.#actualizarFila(e.idActual, {
      estado: Estado.PENDIENTE,
      fechaFin: null,
    });
    await this.#abrirPaso(anterior(e.orden, e.idActual));
    return this.cargar(this.#ids, e.idCpActivo);
  }

  /**
   * Finaliza el PROCEDIMIENTO activo (solo desde su último paso). No finaliza la
   * consulta: eso es una acción aparte (finalizarConsulta) que exige que todos
   * los procedimientos estén finalizados. Tras finalizar se carga el siguiente
   * procedimiento pendiente, o se permanece en el actual si ya no quedan.
   */
  async finalizarProcedimiento(borrador, { confirmado = false } = {}) {
    const e = this.#exigirCarga();
    const { estado, haySiguiente } = this.#contextoPaso();
    alFinalizar(estado, haySiguiente);

    const b = this.#normalizarBorrador(borrador);
    const plan = this.#planificar(b);
    this.#exigirConfirmacion(this.#avisos(b, plan, true), confirmado);

    await escribirCambiosAtencion(this.#f, e, this.#ids, b, plan, this.#ahora);
    const ahora = this.#ahora();
    await this.#actualizarFila(e.idActual, {
      estado: Estado.FINALIZADO,
      fechaFin: ahora,
    });

    const svcCP = this.#f.consultaProcedimiento(this.#ids.idConsulta);
    const cp = await svcCP.findById(e.cp.idConsultaProcedimiento);
    cp.fechaFin = ahora;
    await svcCP.update(cp.idConsultaProcedimiento, cp);

    const procActual = e.procedimientosPorId?.get(e.idCpActivo);
    if (procActual) procActual.completa = true;

    const siguientePendiente = [
      ...(e.procedimientosPorId?.values() ?? []),
    ].find((p) => !p.completa);
    return this.cargar(
      this.#ids,
      siguientePendiente?.cp.idConsultaProcedimiento ?? e.idCpActivo,
    );
  }

  /**
   * @deprecated Ambigua desde que hay varios procedimientos: finaliza solo el
   * procedimiento activo. Usar finalizarProcedimiento o finalizarConsulta.
   */
  finalizar(borrador, opciones) {
    return this.finalizarProcedimiento(borrador, opciones);
  }

  /**
   * Cierra la consulta (consulta.fecha_fin). Solo es posible cuando todos sus
   * procedimientos están finalizados y la consulta sigue abierta.
   * @throws {ErrorEstado}
   */
  async finalizarConsulta() {
    const e = this.#exigirCarga();
    alFinalizarConsulta(
      this.#todosLosProcedimientosCompletos(e),
      e.consultaFinalizada,
    );

    const ahora = this.#ahora();
    const svcConsulta = this.#f.consulta(this.#ids.idPersonaRol);
    const consulta = await svcConsulta.findById(this.#ids.idConsulta);
    await svcConsulta.update(
      consulta.idConsulta,
      consulta.con({ fechaFin: new Date(ahora) }),
    );
    return this.cargar(this.#ids, e.idCpActivo);
  }

  #todosLosProcedimientosCompletos(e) {
    return e.procedimientosPorId
      ? [...e.procedimientosPorId.values()].every((p) => p.completa)
      : true;
  }

  #ordenesInfo() {
    const e = this.#e;
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

  #borradorPersistido() {
    const info = this.#ordenesInfo().filter((o) => o.idPpe);
    return {
      examenes: info.map((o) => o.idPpe),
      resultados: Object.fromEntries(
        info
          .filter((o) => o.resultado)
          .map((o) => [
            o.idPpe,
            {
              resultado: o.resultado.resultado,
              interpretacion: o.resultado.interpretacion,
            },
          ]),
      ),
    };
  }

  #normalizarBorrador(borrador) {
    const guardado = this.#borradorPersistido();
    const b = borrador ?? {};
    const delBorrador = Object.fromEntries(
      Object.entries(b.resultados ?? {}).map(([id, d]) => [
        id.toLowerCase(),
        d,
      ]),
    );
    return {
      referenciaExterna: b.referenciaExterna,
      notas: b.notas,
      examenes:
        b.examenes === undefined
          ? guardado.examenes
          : leerIds(escribirIds(b.examenes)),
      resultados: { ...guardado.resultados, ...delBorrador },
    };
  }

  #planificar(b) {
    const e = this.#e;
    const plan = planificarSeleccion(
      b.examenes,
      this.#ordenesInfo().map((o) => ({
        id: o.idOrden,
        indicaciones: o.indicaciones,
        tieneResultado: tieneTexto(o.resultado),
      })),
    );

    // VALIDACIÓN ESTRICTA: Verificar que cada ID a crear pertenezca exclusivamente al conjunto asignable actual
    const permitidos = new Set([...e.nombrePorPpe.keys()]);
    const intentoMalicioso = plan.crear.some(
      (id) => !permitidos.has(id.toLowerCase()),
    );

    if (
      intentoMalicioso ||
      plan.crear.some((id) => !e.nombrePorPpe.has(id.toLowerCase()))
    ) {
      throw new Error(
        "Se ha detectado un intento de asignar exámenes que no corresponden a este procedimiento o paso.",
      );
    }
    return plan;
  }

  #avisos(b, plan, cerrando) {
    const e = this.#e;
    const avisos = [];
    const perdidos = plan.quitar
      .filter((q) => q.tieneResultado)
      .map((q) => e.nombrePorPpe.get(q.idPpe) ?? "Examen");
    const quitados = mensajeExamenesQuitados(perdidos);
    if (quitados) avisos.push(quitados);

    if (cerrando) {
      const sin = ordenesSinResultado(
        b.examenes.map((id) => ({ id })),
        b.examenes.map((id) => ({
          idOrden: id,
          resultado: b.resultados[id]?.resultado ?? null,
        })),
      );
      const pendientes = mensajeResultadosPendientes(sin.length);
      if (pendientes) avisos.push(pendientes);
    }
    return avisos;
  }

  #exigirConfirmacion(avisos, confirmado) {
    if (avisos.length > 0 && !confirmado) {
      throw new ConfirmacionRequerida(
        `${avisos.join(" ")} ¿Desea continuar?`,
        avisos,
      );
    }
  }

  #exigirCarga() {
    if (!this.#e) throw new Error("Primero hay que llamar a cargar()");
    return this.#e;
  }

  #contextoPaso() {
    const e = this.#e;
    const fila = e.filaPor.get(e.idActual);
    return {
      estado: fila?.estado ?? null,
      haySiguiente: siguiente(e.orden, e.idActual) !== null,
      hayAnterior: anterior(e.orden, e.idActual) !== null,
    };
  }

  #exigirEditable() {
    const { estado } = this.#contextoPaso();
    if (!puedeEditar(estado)) {
      throw new ErrorEstado(`El paso no admite cambios (estado "${estado}")`);
    }
  }

  async #actualizarFila(idPaso, cambios) {
    const e = this.#e;
    const fila = e.filaPor.get(idPaso);
    Object.assign(fila, cambios);
    // El backend devuelve la fila sin su consulta_procedimiento; sin ella el PUT sale con null.
    fila.idConsultaProcedimiento = e.cp.idConsultaProcedimiento;
    await this.#f
      .consultaProcedimientoPaso(e.cp.idConsultaProcedimiento)
      .update(fila.idConsultaProcedimientoPaso, fila);
  }

  async #responsableParaAbrir(idPaso, e = this.#e) {
    if (fueAtendido(e.filaPor.get(idPaso))) return null;
    if (e.orden[0] === idPaso && this.#empleadoValido()) {
      return this.#idPersonaRolEmpleado;
    }
    return this.#sortearResponsable(e);
  }

  #empleadoValido() {
    return (
      Boolean(this.#idPersonaRolEmpleado) &&
      this.#idPersonaRolEmpleado !== this.#ids?.idPersonaRol
    );
  }

  /**
   * Clínica de la consulta. Según el DDL no es de la consulta sino de su
   * persona_rol (persona_rol.id_clinica). Casi siempre ya viene en la consulta;
   * si no, se consulta el persona_rol del paciente. Se guarda en el contexto
   * de la carga para no repetir la consulta en cada sorteo.
   */
  async #idClinicaDe(e) {
    if (e.idClinica) return e.idClinica;
    let idClinica = idClinicaDeConsulta(e.consulta);
    const idPersonaRol = this.#ids?.idPersonaRol;
    const idPersona = e.paciente?.idPersona;
    if (!idClinica && idPersonaRol && idPersona) {
      const personaRol = await this.#f
        .personaRol(idPersona)
        .findById(idPersonaRol);
      idClinica = personaRol?.idDeClinica?.() ?? null;
    }
    if (idClinica) e.idClinica = idClinica;
    return idClinica;
  }

  async #sortearResponsable(e) {
    const idClinica = await this.#idClinicaDe(e);
    if (!idClinica) {
      throw new Error(
        "No se pudo determinar la clínica de la consulta (ni la consulta ni el persona_rol del paciente la traen)",
      );
    }
    const personal = candidatosResponsable(
      await this.#f.personalDeClinica(idClinica),
    );
    const elegido = elegirResponsable(personal, this.#azar);
    if (!elegido) {
      throw new Error(
        "No hay personal disponible en la clínica para atender el paso",
      );
    }
    return elegido.idPersonaRol;
  }

  async #abrirPaso(idPaso, estadoContexto = null, responsable = undefined) {
    const e = estadoContexto ?? this.#e;
    const fila = e.filaPor.get(idPaso);
    if (fila && parsearEstado(fila.estado) === Estado.EN_CURSO) return;

    const idResponsable =
      responsable !== undefined
        ? responsable
        : await this.#responsableParaAbrir(idPaso, e);

    const svc = this.#f.consultaProcedimientoPaso(e.cp.idConsultaProcedimiento);
    if (fila) {
      fila.estado = Estado.EN_CURSO;
      fila.fechaFin = null;
      fila.fechaInicio = fila.fechaInicio ?? this.#ahora();

      // Garantiza que idPersonaRol sea { idPersonaRol: uuid } (START_OBJECT) y no un string
      const uuidActual =
        typeof fila.idPersonaRol === "string"
          ? fila.idPersonaRol
          : fila.idPersonaRol?.idPersonaRol;
      const uuidFinal = idResponsable || uuidActual || null;
      fila.idPersonaRol = uuidFinal ? { idPersonaRol: uuidFinal } : null;

      await svc.update(fila.idConsultaProcedimientoPaso, fila);
    } else {
      const nueva = new ConsultaProcedimientoPaso({
        estado: Estado.EN_CURSO,
        fechaInicio: this.#ahora(),
        idConsultaProcedimiento: e.cp.idConsultaProcedimiento,
        idProcedimientoPaso: idPaso,
        idPersonaRol: idResponsable ? { idPersonaRol: idResponsable } : null,
      });
      nueva.idConsultaProcedimientoPaso = await svc.create(nueva);
      e.filaPor.set(idPaso, nueva);
    }
  }

  #vista() {
    return construirVista(
      this.#e,
      () => this.#contextoPaso(),
      () => this.#ordenesInfo(),
    );
  }
}
