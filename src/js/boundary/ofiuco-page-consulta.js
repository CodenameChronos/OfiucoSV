/**
 * @fileoverview Web Component `<ofiuco-page-consulta>` que implementa la pantalla
 * principal de seguimiento y atención de consulta médica (HU4). Coordina la carga
 * de estado desde `AtencionService`, el mantenimiento de un borrador local editable
 * frente a la vista persistida, la asignación y captura de resultados de exámenes,
 * la navegación secuencial entre pasos (`stepper`), los diálogos de confirmación
 * (`ConfirmacionRequerida`) y la notificación mediante toasts.
 */

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

/** @type {string} URL resuelta de la hoja de estilos principal de la página de consulta. */
const stylesUrl = new URL(
  "../../resources/styles/page_consulta.css",
  import.meta.url,
).href;

/**
 * Determina si un error capturado corresponde a una solicitud de confirmación
 * explícita por parte de la capa de control/servicio (`ConfirmacionRequerida`).
 *
 * @param {*} error - Objeto o excepción capturada.
 * @returns {boolean} `true` si requiere confirmación del usuario antes de proceder.
 */
const esConfirmacion = (error) => error?.name === "ConfirmacionRequerida";

/**
 * Extrae un mensaje legible de un error HTTP del proyecto (`error.mensaje`) o de una
 * instancia estándar de `Error` (`error.message`), devolviendo un texto genérico de respaldo.
 *
 * @param {*} error - Objeto de error capturado.
 * @returns {string} Mensaje descriptivo listo para mostrar al usuario.
 */
const mensajeDeError = (error) =>
  String(error?.mensaje || error?.message || "").trim() ||
  "Ocurrió un error inesperado.";

/**
 * Extrae la lista de identificadores `idProcedimientoPasoExamen` de las órdenes
 * contenidas en un objeto de vista de consulta.
 *
 * @param {Object|null|undefined} vista - Vista actual devuelta por el servicio.
 * @returns {Array<number|string>} Arreglo de IDs de exámenes ordenados en el paso.
 */
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
 * Emite `ConsultaEventos.SALIR` (hacia la shell) cuando el usuario regresa al dashboard.
 *
 * @extends BaseComponent
 * @fires CustomEvent#ofiuco:consulta-salir
 */
export class OfiucoPageConsulta extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
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

  get terminado() {
    return this.#ultima;
  }

  /**
   * Construye toda la estructura DOM de la página de atención de consulta dentro del Shadow DOM
   * (toasts, diálogo de confirmación, indicadores de estado, cabecera con paciente y referencia,
   * sección del paso con notas/resultados/acciones, y barra lateral con asignador y stepper)
   * y conecta todos los eventos internos.
   */
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

  /**
   * Ciclo de vida ejecutado al conectar el componente al DOM.
   * Si ya existe un `contexto` configurado y el estado inicial sigue en `"vacio"`,
   * inicia la carga de la consulta.
   */
  onConnect() {
    if (this.#contexto && this.#estado === "vacio") {
      this.#ultima = this.#cargar();
    }
  }

  /**
   * Suscribe los manejadores de eventos personalizados de `ConsultaEventos` en el
   * `shadowRoot`, deteniendo su propagación hacia el exterior de la página y delegando
   * cada acción en las funciones puras del borrador o en los métodos del servicio.
   */
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

  /**
   * Devuelve la instancia de servicio inyectada o realiza una importación dinámica
   * de `AtencionService` inicializándolo con `idPersonaRolEmpleado` del contexto.
   *
   * @returns {Promise<Object>} Instancia lista de `AtencionService`.
   */
  async #obtenerServicio() {
    if (this.#servicio) return this.#servicio;
    const { default: AtencionService } =
      await import("../control/atencion_consulta_service.js");
    this.#servicio = new AtencionService({
      idPersonaRolEmpleado: this.#contexto.idPersonaRolEmpleado ?? null,
    });
    return this.#servicio;
  }

  /**
   * Carga los datos completos de la consulta médica a partir de `#contexto`,
   * gestionando concurrencia mediante `#cargaId`, inicializando `#vista` y `#borrador`
   * y actualizando `#estado` (`"cargando"` -> `"listo"` o `"error"`).
   *
   * @returns {Promise<void>}
   */
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

  /**
   * Adopta la vista que devolvió el servicio: reinicia el borrador y reconcilia
   * la selección (la cantidad de exámenes ordenados pudo subir o bajar).
   *
   * @param {Object} vista - Nueva vista persistida devuelta por `AtencionService`.
   * @returns {boolean} `true` si cambió el identificador del paso actual.
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

  /**
   * Persiste los cambios del borrador actual en el backend y muestra un toast de confirmación.
   * @returns {Promise<void>}
   */
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

  /**
   * Solicita confirmación modal al usuario antes de cerrar definitivamente la consulta
   * mediante `this.#servicio.finalizar()`.
   *
   * @returns {Promise<void>}
   */
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

  /**
   * Verifica si existen cambios sin guardar entre `#borrador` y `#vista`; de haberlos,
   * pide confirmación modal para descartarlos antes de emitir `ConsultaEventos.SALIR`.
   *
   * @returns {Promise<void>}
   */
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
   * Ejecuta una operación del servicio: bloquea la pantalla (`#ocupado = true`),
   * gestiona el flujo de confirmación si aplica, reinicia el borrador con la vista nueva,
   * avisa del resultado mediante `#toast` y enfoca el título si hubo transición de paso.
   * Ante un error el borrador se conserva intacto.
   *
   * @param {(opciones: { confirmado?: boolean }) => Promise<Object>} operacion - Función que invoca el método correspondiente del servicio.
   * @param {string|null} [mensajeExito=null] - Mensaje opcional a mostrar en un toast de éxito.
   * @returns {Promise<void>}
   */
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

  /**
   * Envuelve una operación del servicio capturando excepciones `ConfirmacionRequerida`:
   * abre `#dialogo.preguntar` con los avisos recibidos y reintenta la operación con
   * `{ confirmado: true }` si el usuario acepta, o devuelve `null` si cancela.
   *
   * @param {(opciones: { confirmado?: boolean }) => Promise<Object>} operacion - Operación asíncrona del servicio.
   * @returns {Promise<Object|null>} Vista resultante o `null` si el usuario canceló la confirmación.
   */
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

  /**
   * Aplica una función de transformación pura sobre `#borrador` y repinta la interfaz.
   * Se ignora si no hay borrador, si hay una operación en curso o si la consulta es de solo lectura.
   *
   * @param {(borrador: Object) => Object} transformar - Función pura que devuelve el nuevo estado del borrador.
   */
  #editar(transformar) {
    if (!this.#borrador || this.#ocupado || soloLectura(this.#vista)) return;
    this.#borrador = transformar(this.#borrador);
    this.#pintar();
  }

  // ---------------------------------------------------------------- pintado

  /**
   * Sincroniza todos los subcomponentes visuales de la página (`#paciente`, `#titulo`,
   * `#referencia`, `#notas`, `#resultados`, `#asignador`, `#stepper` y botones de acción)
   * a partir del estado actual (`#estado`, `#vista`, `#borrador`, `#seleccionado` y `#ocupado`).
   */
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

  /**
   * Asigna el valor textual a un `<ofiuco-text-area>` únicamente si difiere del actual
   * (evitando saltos de cursor durante la escritura) y sincroniza su atributo `readonly`.
   *
   * @param {HTMLElement} area - Instancia de `<ofiuco-text-area>`.
   * @param {string|null|undefined} valor - Texto esperado para el campo.
   * @param {boolean} bloqueado - Indica si el campo debe quedar en modo de solo lectura.
   */
  #sincronizarCampo(area, valor, bloqueado) {
    const texto = valor ?? "";
    if (area.value !== texto) area.value = texto;
    area.toggleAttribute("readonly", bloqueado);
  }
}

defineOnce("ofiuco-page-consulta", OfiucoPageConsulta);
export default OfiucoPageConsulta;
