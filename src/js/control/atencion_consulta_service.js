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
} from "./estado_paso.js";
import { leerIds, escribirIds } from "./indicaciones_service.js";
import {
  ordenesSinResultado,
  mensajeResultadosPendientes,
  mensajeExamenesQuitados,
  planificarSeleccion,
} from "./reglas_consulta.js";

// Importar los nuevos módulos atómicos
import {
  cargarDatosAtencion,
  _cargarOrdenes,
} from "./atencion/atencion_loader.js";
import { escribirCambiosAtencion } from "./atencion_consulta_writer.js";
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
  consultaProcedimientoPaso: (idCP) =>
    new ConsultaProcedimientoPasoService(idCP),
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
};

const tieneTexto = (resultado) =>
  Boolean(resultado) &&
  (String(resultado.resultado ?? "").trim() !== "" ||
    String(resultado.interpretacion ?? "").trim() !== "");

export default class AtencionService {
  #f;
  #idPersonaRolEmpleado;
  #ahora;
  #ids = null;
  #e = null;

  constructor({
    fabrica = {},
    idPersonaRolEmpleado = null,
    ahora = () => new Date().toISOString(),
  } = {}) {
    this.#f = { ...FABRICA_POR_DEFECTO, ...fabrica };
    this.#idPersonaRolEmpleado = idPersonaRolEmpleado;
    this.#ahora = ahora;
  }

  async cargar({ idPersonaRol, idConsulta }) {
    this.#ids = { idPersonaRol, idConsulta };
    this.#e = await cargarDatosAtencion(this.#f, this.#ids, (id, estado) =>
      this.#abrirPaso(id, estado),
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

    await escribirCambiosAtencion(this.#f, e, this.#ids, b, plan, this.#ahora);
    await this.#actualizarFila(e.idActual, {
      estado: Estado.FINALIZADO,
      fechaFin: this.#ahora(),
    });
    await this.#abrirPaso(siguiente(e.orden, e.idActual));
    return this.cargar(this.#ids);
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
    return this.cargar(this.#ids);
  }

  async finalizar(borrador, { confirmado = false } = {}) {
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

    const svcConsulta = this.#f.consulta(this.#ids.idPersonaRol);
    const consulta = await svcConsulta.findById(this.#ids.idConsulta);
    await svcConsulta.update(
      consulta.idConsulta,
      consulta.con({ fechaFin: new Date(ahora) }),
    );

    return this.cargar(this.#ids);
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
    if (plan.crear.some((id) => !e.nombrePorPpe.has(id))) {
      throw new Error(
        "Hay exámenes seleccionados que no pertenecen a este paso",
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
    await this.#f
      .consultaProcedimientoPaso(e.cp.idConsultaProcedimiento)
      .update(fila.idConsultaProcedimientoPaso, fila);
  }

  async #abrirPaso(idPaso, estadoContexto = null) {
    const e = estadoContexto ?? this.#e;
    const fila = e.filaPor.get(idPaso);
    if (fila && parsearEstado(fila.estado) === Estado.EN_CURSO) return;

    const svc = this.#f.consultaProcedimientoPaso(e.cp.idConsultaProcedimiento);
    if (fila) {
      fila.estado = Estado.EN_CURSO;
      fila.fechaFin = null;
      fila.fechaInicio = fila.fechaInicio ?? this.#ahora();
      if (this.#idPersonaRolEmpleado)
        fila.idPersonaRol = this.#idPersonaRolEmpleado;
      await svc.update(fila.idConsultaProcedimientoPaso, fila);
    } else {
      const nueva = new ConsultaProcedimientoPaso({
        estado: Estado.EN_CURSO,
        fechaInicio: this.#ahora(),
        idConsultaProcedimiento: e.cp.idConsultaProcedimiento,
        idProcedimientoPaso: idPaso,
        idPersonaRol: this.#idPersonaRolEmpleado,
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
