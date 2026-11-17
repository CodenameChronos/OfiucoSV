import { BaseComponent } from "./core/base-component.js";
import { defineOnce } from "./core/define-once.js";
import { h } from "./core/dom.js";
import { ConsultaEventos } from "./core/eventos-consulta.js";
import {
  clave,
  soloLectura,
  conciliarSeleccion,
  borradorDesdeVista,
  hayCambios,
  modeloResultados,
  modeloAsignador,
  agregarExamen,
  quitarExamen,
  escribirResultado,
} from "../control/atencion_consulta_examenes.js";
import { BUTTON_CLICK } from "./components/functional/ofiuco-button.js";
import "./components/primitives/ofiuco-text-area.js";
import "./components/functional/ofiuco-save-button.js";
import "./components/functional/ofiuco-end-button.js";
import "./components/functional/ofiuco-return-button.js";
import "./components/layout/sidebar.js";
import "./components/functional/ofiuco-patient-info.js";
import "./components/functional/ofiuco-exam-results.js";
import "./components/functional/ofiuco-exam-assigner.js";
import "./components/functional/ofiuco-stepper.js";
import "./components/layout/ofiuco-confirm-dialog.js";
import "./components/utils/ofiuco-toast.js";

const stylesUrl = new URL(
  "../../resources/styles/page_consulta.css",
  import.meta.url,
).href;

const esConfirmacion = (error) => error?.name === "ConfirmacionRequerida";
const mensajeDeError = (error) =>
  String(error?.mensaje || error?.message || "").trim() ||
  "Ocurrió un error inesperado.";
const idsDe = (vista) =>
  (vista?.ordenes ?? []).map((o) => o.idProcedimientoPasoExamen);

export class OfiucoPageConsulta extends BaseComponent {
  static styleUrls = [stylesUrl];

  #selectorProc;

  #contexto = null;
  #servicio = null;
  #servicioInyectado = false;

  #estado = "vacio"; // vacio | cargando | listo | error
  #mensajeError = "";
  #vista = null;
  #borrador = null;
  #seleccionado = null;
  #ocupado = false;
  #cargaId = 0;
  #ultima = Promise.resolve();

  #toast;
  #dialogo;
  #estadoEl;
  #reintentar;
  #consultaEl;
  #paciente;
  #referencia;
  #regresar;
  #titulo;
  #guardar;
  #notas;
  #resultados;
  #finalizar;
  #asignador;
  #stepper;

  get contexto() {
    return this.#contexto;
  }

  set contexto(valor) {
    this.#contexto = valor ?? null;
    if (!this.#servicioInyectado) this.#servicio = null;
    if (this.rendered && this.#contexto) this.#ultima = this.#cargar();
  }

  get servicio() {
    return this.#servicio;
  }

  set servicio(valor) {
    this.#servicio = valor ?? null;
    this.#servicioInyectado = valor != null;
  }

  /** Promesa de la última operación iniciada (carga, guardar, avanzar...). */
  get terminado() {
    return this.#ultima;
  }

  render() {
    this.#toast = h("ofiuco-toast");
    this.#dialogo = h("ofiuco-confirm-dialog");
    this.#estadoEl = h("p", { class: "estado", role: "status" });
    this.#reintentar = h("ofiuco-button", {
      label: "Reintentar",
      variant: "primary",
    });
    this.#reintentar.addEventListener(BUTTON_CLICK, (evento) => {
      evento.stopPropagation();
      if (this.#contexto) this.#ultima = this.#cargar();
    });

    this.#paciente = h("ofiuco-patient-info");
    this.#referencia = h("ofiuco-text-area", {
      label: "Referencia externa",
      rows: "1",
      placeholder: "Opcional...",
      "data-campo": "referencia",
    });
    this.#referencia.addEventListener("value-changed", (evento) => {
      evento.stopPropagation();
      this.#editar((b) => ({ ...b, referenciaExterna: evento.detail.value }));
    });
    this.#regresar = h("ofiuco-return-button");

    this.#titulo = h("h1", {
      class: "titulo",
      id: "titulo-paso",
      tabindex: "-1",
    });
    this.#guardar = h("ofiuco-save-button");
    this.#notas = h("ofiuco-text-area", {
      label: "Observaciones",
      rows: "4",
      "data-campo": "notas",
    });
    this.#notas.addEventListener("value-changed", (evento) => {
      evento.stopPropagation();
      this.#editar((b) => ({ ...b, notas: evento.detail.value }));
    });
    this.#resultados = h("ofiuco-exam-results");
    this.#finalizar = h("ofiuco-end-button");

    this.#asignador = h("ofiuco-exam-assigner");
    this.#stepper = h("ofiuco-stepper");

    this.#selectorProc = h("select", {
      class: "selector-procedimiento",
      "aria-label": "Procedimiento activo",
    });
    this.#selectorProc.addEventListener("change", (evento) => {
      const idCp = evento.target.value;
      if (idCp) this.#ultima = this.#alCambiarProcedimiento(idCp);
    });

    this.#consultaEl = h(
      "div",
      { class: "consulta" },
      h(
        "div",
        { class: "principal" },
        h(
          "header",
          { class: "cabecera" },
          this.#paciente,
          this.#referencia,
          this.#regresar,
        ),
        h(
          "section",
          { class: "paso", "aria-labelledby": "titulo-paso" },
          this.#selectorProc,
          h("div", { class: "paso__encabezado" }, this.#titulo, this.#guardar),
          this.#notas,
          this.#resultados,
          this.#finalizar,
        ),
      ),
      h("ofiuco-sidebar", {}, this.#asignador, this.#stepper),
    );

    this.shadowRoot.append(
      h(
        "div",
        { class: "pagina" },
        this.#toast,
        this.#dialogo,
        this.#estadoEl,
        this.#reintentar,
        this.#consultaEl,
      ),
    );

    this.#conectarEventos();
    this.#pintar();
  }

  onConnect() {
    if (this.#contexto && this.#estado === "vacio") {
      this.#ultima = this.#cargar();
    }
  }

  /** Escucha los eventos de los componentes; ninguno se filtra fuera de la página. */
  #conectarEventos() {
    const escuchar = (evento, manejador) =>
      this.shadowRoot.addEventListener(evento, (e) => {
        e.stopPropagation();
        manejador(e);
      });

    escuchar(ConsultaEventos.GUARDAR, () => {
      this.#ultima = this.#alGuardar();
    });
    escuchar(ConsultaEventos.PASO_SIGUIENTE, () => {
      this.#ultima = this.#alAvanzar();
    });
    escuchar(ConsultaEventos.PASO_ANTERIOR, () => {
      this.#ultima = this.#alRetroceder();
    });
    escuchar(ConsultaEventos.FINALIZAR, () => {
      this.#ultima = this.#alFinalizar();
    });
    escuchar(ConsultaEventos.REGRESAR, () => {
      this.#ultima = this.#alRegresar();
    });

    escuchar(ConsultaEventos.EXAMEN_AGREGADO, (e) =>
      this.#editar((b) => agregarExamen(b, e.detail.id)),
    );
    escuchar(ConsultaEventos.QUITAR_EXAMEN, (e) =>
      this.#editar((b) => quitarExamen(b, e.detail.value)),
    );
    escuchar(ConsultaEventos.RESULTADO_CAMBIADO, (e) => {
      const { id, campo, valor } = e.detail;
      this.#editar((b) => escribirResultado(b, id, campo, valor));
    });
    escuchar(ConsultaEventos.EXAMEN_SELECCIONADO, (e) => {
      this.#seleccionado = clave(e.detail.id);
      this.#pintar();
    });
  }

  // ---------------------------------------------------------------- carga

  async #obtenerServicio() {
    if (this.#servicio) return this.#servicio;
    const { default: AtencionService } =
      await import("../control/atencion_consulta_service.js");
    this.#servicio = new AtencionService({
      idPersonaRolEmpleado: this.#contexto.idPersonaRolEmpleado ?? null,
    });
    return this.#servicio;
  }

  async #cargar() {
    const contexto = this.#contexto;
    if (!contexto) return;
    const carga = ++this.#cargaId;

    this.#estado = "cargando";
    this.#pintar();
    try {
      const servicio = await this.#obtenerServicio();
      const vista = await servicio.cargar(
        {
          idPersonaRol: contexto.idPersonaRol,
          idConsulta: contexto.idConsulta,
        },
        contexto.idConsultaProcedimiento ?? null,
      );
      if (carga !== this.#cargaId) return;
      this.#vista = null;
      this.#seleccionado = null;
      this.#aplicarVista(vista);
      this.#estado = "listo";
    } catch (error) {
      if (carga !== this.#cargaId) return;
      this.#estado = "error";
      this.#mensajeError = mensajeDeError(error);
    }
    this.#pintar();
  }

  #aplicarVista(vista) {
    const pasoAnterior = this.#vista?.paso?.id;
    this.#seleccionado = conciliarSeleccion(
      idsDe(this.#vista),
      this.#seleccionado,
      idsDe(vista),
    );
    this.#vista = vista;
    this.#borrador = borradorDesdeVista(vista);
    return pasoAnterior !== undefined && pasoAnterior !== vista.paso.id;
  }

  /** Un procedimiento aparece en el selector si es el activo, o si está en curso y es del usuario de la sesión. */
  #esSeleccionable(p) {
    return p.activo || p.propio;
  }

  // ---------------------------------------------------------------- acciones

  async #alCambiarProcedimiento(idCp) {
    if (this.#ocupado || !this.#vista) return;

    const destino = (this.#vista.procedimientos ?? []).find(
      (p) => String(p.idConsultaProcedimiento) === String(idCp),
    );
    if (!destino || !this.#esSeleccionable(destino)) {
      this.#selectorProc.value = this.#vista.idConsultaProcedimientoActivo;
      this.#toast.mostrar({
        tipo: "error",
        mensaje: "No tiene permiso para abrir ese procedimiento.",
      });
      return;
    }

    if (hayCambios(this.#borrador, this.#vista)) {
      const descartar = await this.#dialogo.preguntar({
        titulo: "Cambios sin guardar",
        avisos: ["Tiene cambios sin guardar en este procedimiento."],
        pregunta: "¿Desea descartarlos y cambiar de procedimiento?",
        aceptar: "Descartar y cambiar",
        cancelar: "Seguir aquí",
      });
      if (!descartar) {
        this.#selectorProc.value = this.#vista.idConsultaProcedimientoActivo;
        return;
      }
    }
    await this.#ejecutar(() => this.#servicio.seleccionarProcedimiento(idCp));
  }

  #alGuardar() {
    return this.#ejecutar(
      (o) => this.#servicio.guardarCambios(this.#borrador, o),
      "Cambios guardados",
    );
  }

  async #alRetroceder() {
    if (this.#ocupado || !this.#vista) return;
    this.#ocupado = true;
    this.#pintar();

    try {
      const vista = await this.#conConfirmacion((o) =>
        this.#servicio.retroceder(this.#borrador, o),
      );
      if (vista === null) return; // el usuario canceló la confirmación

      this.dispatchEvent(
        new CustomEvent(ConsultaEventos.SALIR, {
          detail: { idConsulta: this.#contexto?.idConsulta },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error) {
      this.#toast.mostrar({ tipo: "error", mensaje: mensajeDeError(error) });
    } finally {
      this.#ocupado = false;
      this.#pintar();
    }
  }

  async #alAvanzar() {
    if (this.#ocupado || !this.#vista) return;
    this.#ocupado = true;
    this.#pintar();

    try {
      const vista = await this.#conConfirmacion((o) =>
        this.#servicio.avanzar(this.#borrador, o),
      );
      if (vista === null) return;

      this.dispatchEvent(
        new CustomEvent(ConsultaEventos.SALIR, {
          detail: { idConsulta: this.#contexto?.idConsulta },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error) {
      this.#toast.mostrar({ tipo: "error", mensaje: mensajeDeError(error) });
    } finally {
      this.#ocupado = false;
      this.#pintar();
    }
  }

  async #alFinalizar() {
    if (this.#ocupado || !this.#vista) return;
    const acepta = await this.#dialogo.preguntar({
      titulo: "Finalizar consulta",
      pregunta:
        "Al finalizar, la consulta quedará cerrada y no podrá modificarse. ¿Desea continuar?",
      aceptar: "Finalizar consulta",
      cancelar: "Volver",
    });
    if (!acepta) return;

    this.#ocupado = true;
    this.#pintar();
    try {
      const vista = await this.#conConfirmacion((o) =>
        this.#servicio.finalizar(this.#borrador, o),
      );
      if (vista === null) return;

      this.dispatchEvent(
        new CustomEvent(ConsultaEventos.SALIR, {
          detail: { idConsulta: this.#contexto?.idConsulta },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error) {
      this.#toast.mostrar({ tipo: "error", mensaje: mensajeDeError(error) });
    } finally {
      this.#ocupado = false;
      this.#pintar();
    }
  }

  async #alRegresar() {
    if (this.#ocupado || !this.#vista) return;
    if (hayCambios(this.#borrador, this.#vista)) {
      const descartar = await this.#dialogo.preguntar({
        titulo: "Cambios sin guardar",
        avisos: ["Tiene cambios que no se han guardado."],
        pregunta: "¿Desea descartarlos y salir de la consulta?",
        aceptar: "Descartar y salir",
        cancelar: "Seguir editando",
      });
      if (!descartar) return;
    }
    this.dispatchEvent(
      new CustomEvent(ConsultaEventos.SALIR, {
        detail: { idConsulta: this.#contexto?.idConsulta },
        bubbles: true,
        composed: true,
      }),
    );
  }

  async #ejecutar(operacion, mensajeExito = null) {
    if (this.#ocupado || !this.#vista) return;
    this.#ocupado = true;
    this.#pintar();

    let cambioDePaso = false;
    try {
      const vista = await this.#conConfirmacion(operacion);
      if (vista === null) return;
      cambioDePaso = this.#aplicarVista(vista);
      if (mensajeExito) {
        this.#toast.mostrar({ tipo: "exito", mensaje: mensajeExito });
      }
    } catch (error) {
      this.#toast.mostrar({ tipo: "error", mensaje: mensajeDeError(error) });
    } finally {
      this.#ocupado = false;
      this.#pintar();
    }
    if (cambioDePaso) this.#titulo.focus();
  }

  async #conConfirmacion(operacion) {
    try {
      return await operacion({});
    } catch (error) {
      if (!esConfirmacion(error)) throw error;
      const acepta = await this.#dialogo.preguntar({
        titulo: "Confirmar cambios",
        avisos: error.avisos ?? [error.message],
      });
      return acepta ? operacion({ confirmado: true }) : null;
    }
  }

  #editar(transformar) {
    if (!this.#borrador || this.#ocupado || soloLectura(this.#vista)) return;
    this.#borrador = transformar(this.#borrador);
    this.#pintar();
  }

  // ---------------------------------------------------------------- pintado

  #pintar() {
    const estado = this.#estado;
    this.#estadoEl.hidden = estado === "listo" || estado === "vacio";
    this.#estadoEl.textContent =
      estado === "cargando"
        ? "Cargando consulta..."
        : estado === "error"
          ? this.#mensajeError
          : "";
    this.#reintentar.hidden = estado !== "error";
    this.#consultaEl.hidden = estado !== "listo";
    if (estado !== "listo" || !this.#vista) return;

    const vista = this.#vista;
    const borrador = this.#borrador;
    const lectura = soloLectura(vista);
    const bloqueado = lectura || this.#ocupado;

    const procs = vista.procedimientos ?? [];
    console.table(
      procs.map((p) => ({
        id: p.idConsultaProcedimiento,
        nombre: p.nombre,
        activo: p.activo,
        propio: p.propio,
        estado: p.estado,
        seleccionable: this.#esSeleccionable(p),
      })),
    );
    const visibles = procs.filter((p) => this.#esSeleccionable(p));
    this.#selectorProc.hidden = visibles.length <= 1;
    this.#selectorProc.disabled = this.#ocupado;
    this.#selectorProc.replaceChildren(
      ...visibles.map((p) =>
        h(
          "option",
          { value: p.idConsultaProcedimiento, selected: p.activo },
          `${p.nombre} (${p.pasosCompletados}/${p.totalPasos})${p.completa ? " — Finalizado" : ""}`,
        ),
      ),
    );
    this.#selectorProc.value = vista.idConsultaProcedimientoActivo;

    this.#paciente.model = vista.paciente;
    this.#titulo.textContent = vista.paso.nombre ?? "Paso";
    this.#titulo.title = vista.paso.nombre ?? "";
    this.#sincronizarCampo(
      this.#referencia,
      borrador.referenciaExterna,
      bloqueado,
    );
    this.#sincronizarCampo(this.#notas, borrador.notas, bloqueado);

    const resultados = modeloResultados(vista, borrador, this.#seleccionado);
    this.#resultados.model = {
      ...resultados,
      readonly: resultados.readonly || this.#ocupado,
    };
    const asignador = modeloAsignador(vista, borrador);
    this.#asignador.model = {
      ...asignador,
      readonly: asignador.readonly || this.#ocupado,
    };

    this.#stepper.model = vista.paso;
    this.#stepper.toggleAttribute("busy", this.#ocupado);

    this.#guardar.hidden = lectura;
    this.#guardar.disabled = this.#ocupado || !hayCambios(borrador, vista);
    this.#finalizar.hidden = lectura || !vista.paso.puedeFinalizar;
    this.#finalizar.disabled = this.#ocupado;
    this.#regresar.disabled = this.#ocupado;
  }

  #sincronizarCampo(area, valor, bloqueado) {
    const texto = valor ?? "";
    if (area.value !== texto) area.value = texto;
    area.toggleAttribute("readonly", bloqueado);
  }
}

defineOnce("ofiuco-page-consulta", OfiucoPageConsulta);
export default OfiucoPageConsulta;
