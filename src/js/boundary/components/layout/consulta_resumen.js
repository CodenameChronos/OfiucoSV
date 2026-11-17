/**
 * @fileoverview Web Component `<consulta_resumen>` para visualizar el detalle
 * completo de una consulta médica: información general (paciente, fechas, estado,
 * observaciones), listado de procedimientos asociados, pasos ejecutados y consulta
 * bajo demanda del registro/resultados de cada paso mediante `DashboardService`.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import DashboardService from "../../../control/dashboard_service.js";
import { formatDate, getPatientName, relationName } from "../utils/consulta-format.js";
import "../primitives/simple_info.js";
import "./resume_element.js";

/** @type {string} URL resuelta de la hoja de estilos asociada al resumen de consulta. */
const stylesUrl = new URL(
  "../../../../resources/styles/components/consulta_resumen.css",
  import.meta.url,
).href;

/**
 * Componente web `<ofiuco-consulta-resumen>`.
 *
 * Renderiza el resumen estructurado de una consulta recibida a través de la propiedad
 * `consulta`. Para cada paso de cada procedimiento instancia un `<ofiuco-resume-element>`
 * y escucha su evento `ofiuco:resume-ver-registro` para cargar asíncronamente las
 * observaciones, resultados u órdenes de examen correspondientes.
 *
 * @extends BaseComponent
 */
export class OfiucoConsultaResumen extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [stylesUrl];

  #consulta = null;
  #service = null;
  #container;

  get consulta() {
    return this.#consulta;
  }

  set consulta(value) {
    this.#consulta = value ?? null;
    if (this.rendered) this.#paint();
  }

  get service() {
    this.#service ??= new DashboardService();
    return this.#service;
  }

  set service(value) {
    this.#service = value ?? null;
  }

  /**
   * Crea el contenedor raíz dentro del Shadow DOM y ejecuta el pintado inicial.
   */
  render() {
    this.#container = h("div");
    this.shadowRoot.append(this.#container);
    this.#paint();
  }

  /**
   * Reconstruye el contenido de `#container` con la sección de información general
   * y las secciones correspondientes a cada procedimiento de la consulta.
   * Si `#consulta` es nulo, vacía el contenedor.
   */
  #paint() {
    const consulta = this.#consulta;
    if (!consulta) {
      this.#container.replaceChildren();
      return;
    }
    this.#container.replaceChildren(
      this.#general(consulta),
      ...this.#procedimientos(consulta)
    );
  }

  /**
   * Crea un elemento `<ofiuco-simple-info>` con la etiqueta y valor especificados.
   *
   * @param {string} etiqueta - Nombre descriptivo del dato.
   * @param {*} valor - Valor a convertir a texto y mostrar.
   * @returns {HTMLElement} Elemento `<ofiuco-simple-info>` configurado.
   */
  #info(etiqueta, valor) {
    return h("ofiuco-simple-info", { etiqueta, valor: String(valor) });
  }

  /**
   * Construye la sección `<section>` con los metadatos generales de la consulta
   * (paciente, fechas de inicio y fin, estado y observaciones).
   *
   * @param {Object} consulta - Datos de la consulta médica.
   * @returns {HTMLElement} Sección DOM con la información general.
   */
  #general(consulta) {
    return h("section", { class: "detail-section" },
      h("h3", {}, "Información general"),
      h("div", { class: "info-grid" },
        this.#info("Paciente", getPatientName(consulta)),
        this.#info("Inicio", formatDate(consulta.fechaInicio)),
        this.#info("Fin", formatDate(consulta.fechaFin)),
        this.#info("Estado", consulta.fechaFin ? "Finalizada" : "Pendiente"),
        this.#info("Observaciones", consulta.observaciones || "Sin observaciones")
      )
    );
  }

  /**
   * Genera la lista de secciones DOM correspondientes a los procedimientos de la consulta,
   * o un mensaje informativo si la consulta no tiene procedimientos asociados.
   *
   * @param {Object} consulta - Datos de la consulta médica.
   * @returns {HTMLElement[]} Arreglo de secciones `<section>` o contenedor de estado vacío.
   */
  #procedimientos(consulta) {
    const procedimientos = consulta.procedimientos ?? [];
    if (!procedimientos.length) {
      return [h("div", { class: "empty" }, "Esta consulta no tiene procedimientos asociados.")];
    }

    return procedimientos.map((procedimiento) => {
      const pasos = (procedimiento.pasos ?? []).map((paso) => this.#paso(procedimiento, paso));
      return h("section", { class: "detail-section" },
        h("h3", {}, relationName(procedimiento.idProcedimiento, "Procedimiento")),
        ...(pasos.length ? pasos : [h("p", { class: "muted" }, "Sin pasos registrados.")])
      );
    });
  }

  /**
   * Construye el bloque visual de un paso individual dentro de un procedimiento,
   * configurando un `<ofiuco-resume-element>` y conectando el evento `ofiuco:resume-ver-registro`
   * para desplegar su registro clínico bajo demanda.
   *
   * @param {Object} procedimiento - Procedimiento padre al que pertenece el paso.
   * @param {Object} paso - Datos del paso ejecutado en la consulta.
   * @returns {HTMLDivElement} Contenedor `.step` con el resumen y el área de salida del registro.
   */
  #paso(procedimiento, paso) {
    const empleado = paso.idPersonaRol?.nombreCompleto
      ?? [paso.idPersonaRol?.idPersona?.nombres, paso.idPersonaRol?.idPersona?.apellidos].filter(Boolean).join(" ")
      ?? "";

    const detalle = [
      `Estado: ${paso.estado ?? "No especificado"}`,
      `Realizado por: ${empleado || "No especificado"}`
    ];
    if (paso.fechaFin) detalle.push(`Fin: ${formatDate(paso.fechaFin)}`);

    const elemento = h("ofiuco-resume-element");
    elemento.item = {
      titulo: relationName(paso.idProcedimientoPaso, "Paso"),
      subtitulo: detalle.join(" · "),
      fecha: formatDate(paso.fechaInicio),
      accion: "Ver registro",
      estado: paso.fechaFin ? "completado" : "pendiente"
    };

    const salida = h("div", { class: "record" });
    const contenedor = h("div", { class: "step" }, elemento, salida);

    // ofiuco-resume-element avisa con este evento; el resumen lo atiende aquí.
    contenedor.addEventListener("ofiuco:resume-ver-registro", (event) => {
      event.stopPropagation();
      this.#verRegistro(salida, procedimiento.idConsultaProcedimiento, paso.idConsultaProcedimientoPaso);
    });

    return contenedor;
  }

  /**
   * Consulta asíncronamente el detalle del registro de un paso mediante `this.service.obtenerDetallePaso`
   * y vuelca las observaciones, resultados u órdenes de examen en el elemento `salida`.
   * Evita peticiones duplicadas mientras `aria-busy="true"` esté activo.
   *
   * @param {HTMLDivElement} salida - Elemento contenedor donde se renderiza el resultado.
   * @param {string|number} idProcedimiento - Identificador de `ConsultaProcedimiento`.
   * @param {string|number} idPaso - Identificador de `ConsultaProcedimientoPaso`.
   * @returns {Promise<void>}
   */
  async #verRegistro(salida, idProcedimiento, idPaso) {
    if (salida.getAttribute("aria-busy") === "true") return;
    salida.setAttribute("aria-busy", "true");
    salida.textContent = "Consultando registro…";
    try {
      const record = await this.service.obtenerDetallePaso(idProcedimiento, idPaso);
      const orders = record?.ordenExamenList ?? [];
      salida.textContent = record?.observaciones || record?.resultado || (orders.length
        ? JSON.stringify(orders, null, 2)
        : "No hay observaciones ni resultados registrados.");
    } catch (error) {
      salida.textContent = `No se pudo consultar el registro: ${error.message}`;
    } finally {
      salida.removeAttribute("aria-busy");
    }
  }
}

defineOnce("ofiuco-consulta-resumen", OfiucoConsultaResumen);
export default OfiucoConsultaResumen;