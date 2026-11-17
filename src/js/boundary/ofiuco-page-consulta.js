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
  // El servicio HTTP del proyecto reporta el texto en `mensaje`; los Error estándar usan `message`.
  String(error?.mensaje || error?.message || "").trim() ||
  "Ocurrió un error inesperado.";
const idsDe = (vista) =>
  (vista?.ordenes ?? []).map((o) => o.idProcedimientoPasoExamen);

/**
 * <ofiuco-page-consulta> — pantalla de seguimiento de consulta (HU4).
 *
 * Orquesta los componentes presentacionales y el AtencionService:
 *  - `contexto` = { idPersonaRol, idConsulta, idPersonaRolEmpleado? } dispara la carga.
 *  - `servicio` permite inyectar un AtencionService (pruebas, demo). Si no se
 *    inyecta, se crea uno al cargar (importación diferida).
 *  - `terminado` es la promesa de la última operación en curso (útil en pruebas).
 *
 * Estado: la `vista` (lo guardado, que devuelve el servicio) y el `borrador`
 * (lo que el médico está editando). Cada evento de los componentes actualiza el
 * borrador con las funciones puras de atencion_consulta_examenes.js; solo
 * guardar, avanzar, retroceder y finalizar tocan el servicio, y todas devuelven
 * una vista nueva con la que se reinicia el borrador.
 *
 * Confirmaciones: si el servicio lanza ConfirmacionRequerida se muestran sus
 * avisos en un diálogo y, si el usuario acepta, se repite con { confirmado: true }.
 *
 * Emite SALIR (hacia la shell) cuando el usuario regresa al dashboard.
 */
export class OfiucoPageConsulta extends BaseComponent {
  static styleUrls = [stylesUrl];

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
      this.#ultima = this.#ejecutar((o) =>
        this.#servicio.avanzar(this.#borrador, o),
      );
    });
    escuchar(ConsultaEventos.PASO_ANTERIOR, () => {
      this.#ultima = this.#ejecutar((o) =>
        this.#servicio.retroceder(this.#borrador, o),
      );
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
    // El empleado que atiende debe venir en el contexto. No se rellena con idPersonaRol:
    // el servicio descarta al "empleado" que coincide con el persona_rol de la consulta
    // y sortea un responsable al azar entre el personal de la clínica.
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
      const vista = await servicio.cargar({
        idPersonaRol: contexto.idPersonaRol,
        idConsulta: contexto.idConsulta,
      });
      if (carga !== this.#cargaId) return; // llegó un contexto más nuevo
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

  /**
   * Adopta la vista que devolvió el servicio: reinicia el borrador y reconcilia
   * la selección (la cantidad de exámenes ordenados pudo subir o bajar).
   * @returns {boolean} true si cambió el paso actual
   */
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

  // ---------------------------------------------------------------- acciones

  #alGuardar() {
    return this.#ejecutar(
      (o) => this.#servicio.guardarCambios(this.#borrador, o),
      "Cambios guardados",
    );
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
    await this.#ejecutar(
      (o) => this.#servicio.finalizar(this.#borrador, o),
      "Consulta finalizada",
    );
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

  /**
   * Ejecuta una operación del servicio: bloquea la pantalla, gestiona la
   * confirmación, reinicia el borrador con la vista nueva y avisa del resultado.
   * Ante un error el borrador se conserva intacto.
   */
  async #ejecutar(operacion, mensajeExito = null) {
    if (this.#ocupado || !this.#vista) return;
    this.#ocupado = true;
    this.#pintar();

    let cambioDePaso = false;
    try {
      const vista = await this.#conConfirmacion(operacion);
      if (vista === null) return; // el usuario canceló
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
    // Al cambiar de paso se lleva el foco al título para que se anuncie el nuevo paso.
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

  /** Aplica una edición al borrador (ignorada en solo lectura o mientras se guarda). */
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

  /** Asigna el valor solo si cambió (evita saltos del cursor al escribir). */
  #sincronizarCampo(area, valor, bloqueado) {
    const texto = valor ?? "";
    if (area.value !== texto) area.value = texto;
    area.toggleAttribute("readonly", bloqueado);
  }
}

defineOnce("ofiuco-page-consulta", OfiucoPageConsulta);
export default OfiucoPageConsulta;
