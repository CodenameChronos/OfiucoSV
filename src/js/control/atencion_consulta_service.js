/**
 * @file Servicio de atención de una consulta (orquestador).
 *
 * Es la fachada que usa la pantalla de consulta. No contiene reglas de
 * negocio propias: coordina a los demás módulos.
 *
 *  - `atencion_consulta_loader`      → carga el contexto (consulta, paciente, pasos, órdenes).
 *  - `atencion_consulta_mapper`      → convierte el contexto en la "vista" para la pantalla.
 *  - `atencion_consulta_writter`     → persiste los cambios del borrador (notas, exámenes, resultados).
 *  - `atencion_consulta_responsable` → decide quién atiende cada paso.
 *  - `estado_paso`                   → máquina de estados del paso (qué acciones permite cada estado).
 *  - `reglas_consulta`               → reglas puras (planificar selección, mensajes de aviso).
 *
 * ## Ciclo de uso
 * 1. `cargar()` → devuelve la vista inicial. Es obligatorio antes de todo lo demás.
 * 2. El usuario edita un BORRADOR en la pantalla (ver `examenesConsulta`).
 * 3. Acciones sobre el borrador: `guardarCambios`, `avanzar`, `retroceder`,
 *    `finalizarProcedimiento`. Todas guardan el borrador y devuelven la vista nueva.
 * 4. `finalizarConsulta()` cierra la consulta cuando todos los procedimientos terminaron.
 *
 * ## Confirmaciones
 * Si una acción puede causar pérdida de datos o dejar cosas pendientes
 * (p. ej. quitar un examen que ya tiene resultado), lanza
 * {@link ConfirmacionRequerida}. La pantalla muestra los avisos y, si el
 * usuario acepta, repite la acción con `{ confirmado: true }`.
 *
 * ## Estado interno
 * La instancia guarda el contexto cargado (`#e`) y los ids (`#ids`). Cada
 * método público que cambia datos termina devolviendo la vista actualizada.
 *
 * @typedef {Object} FabricaRepositorios
 * Ver {@link FABRICA_POR_DEFECTO}. Se puede sobreescribir parcialmente en el
 * constructor (útil para pruebas).
 *
 * @typedef {Object} BorradorAtencion
 * Borrador que envía la pantalla. Todos los campos son opcionales.
 * @property {string} [referenciaExterna]
 * @property {string} [notas]
 * @property {string[]} [examenes] Ids `idProcedimientoPasoExamen` seleccionados. Si se omite, se asume lo ya guardado.
 * @property {Record<string, {resultado?: string, interpretacion?: string}>} [resultados]
 *   Resultados por id de examen; se mezclan sobre lo ya guardado.
 *
 * @typedef {Object} OpcionesConfirmacion
 * @property {boolean} [confirmado=false] `true` si el usuario ya aceptó los avisos.
 *
 * @typedef {Object} OpcionesAvisos
 * @property {boolean} [cerrando=false] `true` si se evalúa una acción que cierra el paso
 *   (avanzar o finalizar), lo que agrega el aviso de exámenes sin resultado.
 */

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
import {
  construirVista,
  esProcedimientoPropio,
} from "./atencion_consulta_mapper.js";

/**
 * Error que indica que la acción necesita que el usuario confirme antes de
 * ejecutarse (por ejemplo, perdería resultados o dejaría exámenes sin resultado).
 *
 * La pantalla debe mostrar `avisos` y, si el usuario acepta, repetir la
 * acción con `{ confirmado: true }`.
 *
 * @extends Error
 */
export class ConfirmacionRequerida extends Error {
  /**
   * @param {string} mensaje Texto completo para mostrar al usuario.
   * @param {string[]} [avisos=[mensaje]] Avisos individuales que originaron la confirmación.
   */
  constructor(mensaje, avisos = [mensaje]) {
    super(mensaje);
    this.name = "ConfirmacionRequerida";
    this.avisos = avisos;
  }
}

/**
 * Fábrica de repositorios/servicios por defecto. Cada entrada crea el
 * servicio concreto con el id del que depende. Se puede reemplazar cualquier
 * entrada desde el constructor de {@link AtencionService} (`fabrica`).
 *
 * @type {Object<string, Function>}
 */
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

/**
 * Indica si un resultado tiene algún texto útil (resultado o interpretación
 * no vacíos, ignorando espacios).
 *
 * @param {{resultado?: string, interpretacion?: string}|null|undefined} resultado
 * @returns {boolean}
 */
const tieneTexto = (resultado) =>
  Boolean(resultado) &&
  (String(resultado.resultado ?? "").trim() !== "" ||
    String(resultado.interpretacion ?? "").trim() !== "");

/**
 * Servicio de atención de una consulta. Ver la descripción del archivo para
 * el ciclo de uso.
 */
export default class AtencionService {
  /** @type {Object<string, Function>} Fábrica de repositorios en uso. */
  #f;
  /** @type {string|null} persona_rol del empleado de la sesión. */
  #idPersonaRolEmpleado;
  /** @type {() => string} Reloj inyectable (ISO 8601). */
  #ahora;
  /** @type {() => number} Generador de azar inyectable, en [0, 1). */
  #azar;
  /** @type {{idPersonaRol: string, idConsulta: string}|null} Ids de la consulta cargada. */
  #ids = null;
  /** @type {import("./atencion_consulta_loader.js").EstadoContexto|null} Contexto cargado. */
  #e = null;

  /**
   * @param {Object} [opciones]
   * @param {Object<string, Function>} [opciones.fabrica={}] Reemplazos parciales de la fábrica por defecto.
   * @param {string|null} [opciones.idPersonaRolEmpleado=null] persona_rol del empleado de la sesión.
   *   Determina qué procedimientos puede abrir y quién queda como responsable del primer paso.
   * @param {() => string} [opciones.ahora] Devuelve la fecha/hora actual en ISO 8601 (inyectable para pruebas).
   * @param {() => number} [opciones.azar=Math.random] Azar para sortear responsables (inyectable para pruebas).
   */
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

  /**
   * Carga (o recarga) la consulta y devuelve su vista. Si el procedimiento
   * activo no está completo, abre su paso actual (lo pone "En curso").
   *
   * @param {{idPersonaRol: string, idConsulta: string}} ids Ids de la consulta y de su persona_rol.
   * @param {string|null} [idCpPreferido=null] `idConsultaProcedimiento` a activar, si existe.
   * @returns {Promise<Object>} Vista de la pantalla (ver `construirVista`).
   */
  async cargar({ idPersonaRol, idConsulta }, idCpPreferido = null) {
    this.#ids = { idPersonaRol, idConsulta };
    this.#e = await cargarDatosAtencion(
      this.#f,
      this.#ids,
      (id, estado) => this.#abrirPaso(id, estado),
      idCpPreferido,
    );
    this.#e.idPersonaRolEmpleado = this.#idPersonaRolEmpleado; // <-- Asignamos el empleado de turno
    return this.#vista();
  }

  /**
   * Cambia el procedimiento activo. Solo se permite abrir procedimientos
   * "propios" del empleado de la sesión (ver `esProcedimientoPropio`).
   * Si ya es el activo, devuelve la vista sin hacer nada más.
   *
   * @param {string} idConsultaProcedimiento Procedimiento a activar.
   * @returns {Promise<Object>} Vista actualizada.
   * @throws {Error} Si no se ha llamado a `cargar()`, el procedimiento no existe
   *   o el empleado no tiene permiso para abrirlo.
   */
  async seleccionarProcedimiento(idConsultaProcedimiento) {
    const e = this.#exigirCarga();
    if (e.idCpActivo === idConsultaProcedimiento) return this.#vista();

    const destino = e.procedimientosPorId?.get(idConsultaProcedimiento);
    if (
      !destino ||
      !esProcedimientoPropio(destino, this.#idPersonaRolEmpleado)
    ) {
      throw new Error("No tiene permiso para abrir ese procedimiento.");
    }

    await _activarProcedimientoEnContexto(
      this.#f,
      e,
      idConsultaProcedimiento,
      (id, estado) => this.#abrirPaso(id, estado),
    );
    return this.#vista();
  }

  /**
   * Guarda el borrador sin cambiar de paso. Solo recarga las órdenes y sus
   * resultados (no toda la consulta).
   *
   * @param {BorradorAtencion} borrador
   * @param {OpcionesConfirmacion} [opciones]
   * @returns {Promise<Object>} Vista actualizada.
   * @throws {ConfirmacionRequerida} Si hay avisos (p. ej. se quitan exámenes con resultado) y no se confirmó.
   * @throws {ErrorEstado} Si el estado del paso no admite cambios.
   * @throws {Error} Si no se ha cargado la consulta o se intenta asignar un examen ajeno al paso.
   */
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

  /**
   * Calcula los avisos que provocaría guardar el borrador, SIN guardar nada.
   * Sirve para advertir al usuario antes de ejecutar una acción.
   *
   * @param {BorradorAtencion} borrador
   * @param {OpcionesAvisos} [opciones]
   * @returns {string[]} Avisos (vacío si la acción no requiere confirmación).
   * @throws {Error} Si no se ha cargado la consulta o el borrador incluye exámenes ajenos al paso.
   */
  advertencias(borrador, { cerrando = false } = {}) {
    this.#exigirCarga();
    const b = this.#normalizarBorrador(borrador);
    return this.#avisos(b, this.#planificar(b), cerrando);
  }

  /**
   * Guarda el borrador, finaliza el paso actual y abre el siguiente.
   *
   * Orden de operaciones: valida → pide confirmación → decide el responsable
   * del paso siguiente → guarda el borrador → marca el paso actual como
   * FINALIZADO → abre el siguiente → recarga la consulta.
   *
   * @param {BorradorAtencion} borrador
   * @param {OpcionesConfirmacion} [opciones]
   * @returns {Promise<Object>} Vista recargada, ya en el paso siguiente.
   * @throws {ErrorEstado} Si el estado actual no permite avanzar.
   * @throws {ConfirmacionRequerida} Si hay avisos y no se confirmó.
   */
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

  /**
   * Guarda el borrador, deja el paso actual en PENDIENTE y reabre el anterior.
   * El paso anterior conserva a su responsable original (ver `fueAtendido`).
   *
   * @param {BorradorAtencion} borrador
   * @param {OpcionesConfirmacion} [opciones]
   * @returns {Promise<Object>} Vista recargada, ya en el paso anterior.
   * @throws {ErrorEstado} Si el estado actual no permite retroceder.
   * @throws {ConfirmacionRequerida} Si hay avisos y no se confirmó.
   */
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
   *
   * @param {BorradorAtencion} borrador
   * @param {OpcionesConfirmacion} [opciones]
   * @returns {Promise<Object>} Vista recargada.
   * @throws {ErrorEstado} Si el estado actual no permite finalizar.
   * @throws {ConfirmacionRequerida} Si hay avisos y no se confirmó.
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
   * @param {BorradorAtencion} borrador
   * @param {OpcionesConfirmacion} [opciones]
   * @returns {Promise<Object>} Ver {@link AtencionService#finalizarProcedimiento}.
   */
  finalizar(borrador, opciones) {
    return this.finalizarProcedimiento(borrador, opciones);
  }

  /**
   * Cierra la consulta (consulta.fecha_fin). Solo es posible cuando todos sus
   * procedimientos están finalizados y la consulta sigue abierta.
   *
   * @returns {Promise<Object>} Vista recargada (con `consultaFinalizada: true`).
   * @throws {ErrorEstado} Si faltan procedimientos por finalizar o la consulta ya está cerrada.
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

  /**
   * @param {import("./atencion_consulta_loader.js").EstadoContexto} e
   * @returns {boolean} `true` si todos los procedimientos están completos
   *   (o si el contexto no trae la lista de procedimientos).
   */
  #todosLosProcedimientosCompletos(e) {
    return e.procedimientosPorId
      ? [...e.procedimientosPorId.values()].every((p) => p.completa)
      : true;
  }

  /**
   * Resume las órdenes de examen del paso actual con su resultado. Cada orden
   * guarda en `indicaciones` el id del examen (`idPpe`) que la originó.
   * Se toma el primer resultado de cada orden.
   *
   * @returns {{idOrden: string, indicaciones: *, idPpe: string|null,
   *   resultado: {id: string, resultado: string, interpretacion: string}|null}[]}
   */
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

  /**
   * Borrador equivalente a lo que ya está guardado en el servidor para el
   * paso actual (exámenes ordenados y sus resultados).
   *
   * @returns {{examenes: string[], resultados: Record<string, {resultado: string, interpretacion: string}>}}
   */
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

  /**
   * Completa y normaliza el borrador recibido:
   *  - Si no trae `examenes`, usa los ya guardados.
   *  - Si los trae, los pasa por `escribirIds`/`leerIds` para dejarlos en su formato canónico.
   *  - Los `resultados` del borrador (con llaves en minúsculas) se mezclan
   *    sobre los ya guardados; el borrador gana.
   *
   * @param {BorradorAtencion|null|undefined} borrador
   * @returns {{referenciaExterna: string|undefined, notas: string|undefined,
   *   examenes: string[], resultados: Record<string, Object>}}
   */
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

  /**
   * Calcula el plan de cambios (qué órdenes crear, cuáles quitar, etc.) con
   * `planificarSeleccion` y lo valida: todo examen a crear debe estar entre
   * los asignables del paso actual (`nombrePorPpe`).
   *
   * @param {ReturnType<AtencionService["#normalizarBorrador"]>} b Borrador ya normalizado.
   * @returns {{crear: string[], quitar: {idPpe: string, tieneResultado: boolean}[]}}
   *   Plan de cambios (puede traer más campos según `planificarSeleccion`).
   * @throws {Error} Si se intenta crear un examen que no pertenece al procedimiento o paso.
   */
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

    const permitidos = new Set([...e.nombrePorPpe.keys()]);
    const intentoMalicioso = plan.crear.some(
      (id) => !permitidos.has(id.toLowerCase()),
    );

    if (plan.crear.some((id) => !e.nombrePorPpe.has(id.toLowerCase()))) {
      throw new Error(
        "Se ha detectado un intento de asignar exámenes que no corresponden a este procedimiento o paso.",
      );
    }
    return plan;
  }

  /**
   * Arma los avisos que requieren confirmación del usuario:
   *  - Siempre: exámenes que se quitan y ya tenían resultado (se perdería).
   *  - Solo si `cerrando`: exámenes del borrador que quedarían sin resultado.
   *
   * @param {Object} b Borrador normalizado.
   * @param {{quitar: {idPpe: string, tieneResultado: boolean}[]}} plan Plan de {@link AtencionService#planificar}.
   * @param {boolean} cerrando `true` si la acción cierra el paso (avanzar o finalizar).
   * @returns {string[]}
   */
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

  /**
   * Lanza {@link ConfirmacionRequerida} si hay avisos y el usuario aún no confirmó.
   *
   * @param {string[]} avisos
   * @param {boolean} confirmado
   * @throws {ConfirmacionRequerida}
   */
  #exigirConfirmacion(avisos, confirmado) {
    if (avisos.length > 0 && !confirmado) {
      throw new ConfirmacionRequerida(
        `${avisos.join(" ")} ¿Desea continuar?`,
        avisos,
      );
    }
  }

  /**
   * Garantiza que `cargar()` ya se haya llamado.
   *
   * @returns {import("./atencion_consulta_loader.js").EstadoContexto} Contexto cargado.
   * @throws {Error} Si no hay consulta cargada.
   */
  #exigirCarga() {
    if (!this.#e) throw new Error("Primero hay que llamar a cargar()");
    return this.#e;
  }

  /**
   * Estado del paso actual y si existen pasos vecinos.
   *
   * @returns {{estado: string|null, haySiguiente: boolean, hayAnterior: boolean}}
   *   `estado` es `null` si el paso aún no tiene fila de avance.
   */
  #contextoPaso() {
    const e = this.#e;
    const fila = e.filaPor.get(e.idActual);
    return {
      estado: fila?.estado ?? null,
      haySiguiente: siguiente(e.orden, e.idActual) !== null,
      hayAnterior: anterior(e.orden, e.idActual) !== null,
    };
  }

  /**
   * Verifica que el estado del paso actual permita editar.
   *
   * @throws {ErrorEstado} Si el estado no admite cambios.
   */
  #exigirEditable() {
    const { estado } = this.#contextoPaso();
    if (!puedeEditar(estado)) {
      throw new ErrorEstado(`El paso no admite cambios (estado "${estado}")`);
    }
  }

  /**
   * Aplica `cambios` a la fila de avance de un paso (también en memoria) y la
   * persiste. Asegura que la fila lleve su `idConsultaProcedimiento`, porque
   * el backend la devuelve sin él.
   *
   * @param {string} idPaso Paso cuya fila se actualiza (debe existir en `filaPor`).
   * @param {Object} cambios Campos a asignar (p. ej. `estado`, `fechaFin`).
   * @returns {Promise<void>}
   */
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

  /**
   * Decide quién será el responsable de un paso al abrirlo:
   *  1. Si el paso ya se atendió → `null` (conserva a quien lo atendió).
   *  2. Si es el primer paso y hay un empleado válido de sesión → ese empleado.
   *  3. En otro caso → un responsable sorteado del personal de la clínica.
   *
   * @param {string} idPaso Paso que se va a abrir.
   * @param {import("./atencion_consulta_loader.js").EstadoContexto} [e=this.#e] Contexto a usar.
   * @returns {Promise<string|null>} Id del persona_rol, o `null` si se conserva el actual.
   * @throws {Error} Si hay que sortear y no se puede determinar la clínica o no hay personal.
   */
  async #responsableParaAbrir(idPaso, e = this.#e) {
    if (fueAtendido(e.filaPor.get(idPaso))) return null;
    if (e.orden[0] === idPaso && this.#empleadoValido()) {
      return this.#idPersonaRolEmpleado;
    }
    return this.#sortearResponsable(e);
  }

  /**
   * Un empleado es válido como responsable si existe y no es el mismo
   * persona_rol dueño de la consulta (el paciente).
   *
   * @returns {boolean}
   */
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
   *
   * @param {import("./atencion_consulta_loader.js").EstadoContexto & {idClinica?: string}} e
   * @returns {Promise<string|null>} Id de la clínica, o `null` si no se pudo determinar.
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

  /**
   * Sortea un responsable entre el personal de la clínica de la consulta
   * (excluyendo pacientes y repetidos).
   *
   * @param {import("./atencion_consulta_loader.js").EstadoContexto} e
   * @returns {Promise<string>} `idPersonaRol` del responsable elegido.
   * @throws {Error} Si no se puede determinar la clínica o no hay personal disponible.
   */
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

  /**
   * Abre un paso: lo deja "En curso" y le asigna responsable.
   *
   *  - Si el paso ya está En curso, no hace nada.
   *  - Si ya tiene fila, la reactiva (limpia `fechaFin`, conserva `fechaInicio`
   *    si existía) y actualiza su responsable.
   *  - Si no tiene fila, crea una nueva y la registra en `filaPor`.
   *
   * Responsable: si `responsable` es `undefined` se decide con
   * `#responsableParaAbrir`; si es `null`, se conserva el que ya tenía la fila.
   *
   * @param {string} idPaso Paso a abrir.
   * @param {import("./atencion_consulta_loader.js").EstadoContexto|null} [estadoContexto=null]
   *   Contexto a usar (el de la carga en curso); si es `null`, se usa el de la instancia.
   * @param {string|null|undefined} [responsable=undefined] persona_rol ya decidido, o `undefined` para decidirlo aquí.
   * @returns {Promise<void>}
   */
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

  /**
   * Construye la vista actual a partir del contexto cargado.
   *
   * @returns {Object} Ver `construirVista`.
   */
  #vista() {
    return construirVista(
      this.#e,
      () => this.#contextoPaso(),
      () => this.#ordenesInfo(),
    );
  }
}
