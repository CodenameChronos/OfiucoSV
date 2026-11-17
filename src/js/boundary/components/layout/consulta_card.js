/**
 * @fileoverview Web Component `<consulta_card>` que representa la tarjeta visual
 * de una consulta médica. Muestra la referencia o identificador corto, su estado
 * (`"Pendiente"` o `"Finalizada"`), metadatos del paciente, fechas de inicio/fin,
 * cantidad de procedimientos y botones de acción (`"Ver resumen"` y `"Atender consulta"`).
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { formatDate, getPatientName } from "../utils/consulta-format.js";
import "../primitives/simple_info.js";

/**
 * Resuelve la URL absoluta de una hoja de estilos ubicada en el directorio `components`.
 *
 * @param {string} name - Nombre del archivo CSS (ej. `"consulta_card.css"`).
 * @returns {string} URL resuelta de la hoja de estilos.
 */
const styleUrl = (name) =>
  new URL(`../../../../resources/styles/components/${name}`, import.meta.url).href;

/**
 * Componente web `<ofiuco-consulta-card>`.
 *
 * Renderiza una tarjeta resumen para una consulta médica recibida mediante la propiedad
 * `consulta`. Si la consulta aún no tiene `fechaFin`, habilita también el botón para
 * atenderla.
 *
 * Eventos emitidos (`bubbles: true`, `composed: true`) con `detail: { consulta }`:
 * - `ofiuco:consulta-resumen`: Al hacer clic en `"Ver resumen"`.
 * - `ofiuco:consulta-select`: Al hacer clic en `"Atender consulta"` (solo si está pendiente).
 *
 * @extends BaseComponent
 * @fires CustomEvent#ofiuco:consulta-resumen
 * @fires CustomEvent#ofiuco:consulta-select
 */
export class OfiucoConsultaCard extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [styleUrl("button.css"), styleUrl("consulta_card.css")];

  #consulta = null;
  #container;

  get consulta() {
    return this.#consulta;
  }

  set consulta(value) {
    this.#consulta = value ?? null;
    if (this.rendered) this.#paint();
  }

  /**
   * Crea el contenedor raíz en el Shadow DOM y dispara el pintado inicial de la tarjeta.
   */
  render() {
    this.#container = h("div");
    this.shadowRoot.append(this.#container);
    this.#paint();
  }

  /**
   * Construye y reemplaza el contenido de `#container` según los datos de `#consulta`.
   * Si `#consulta` es nulo, vacía el contenedor. Determina el estado de finalización,
   * formatea metadatos mediante `<ofiuco-simple-info>` y adjunta los botones de acción.
   */
  #paint() {
    const consulta = this.#consulta;
    if (!consulta) {
      this.#container.replaceChildren();
      return;
    }

    const finished = Boolean(consulta.fechaFin);
    const reference = consulta.referenciaExterna || consulta.idConsulta?.slice?.(0, 8) || "Sin referencia";
    const procedures = Array.isArray(consulta.procedimientos) ? consulta.procedimientos.length : 0;

    const summaryButton = h("button", { class: "button secondary", type: "button" }, "Ver resumen");
    summaryButton.addEventListener("click", () => this.#emit("ofiuco:consulta-resumen"));

    const actions = h("div", { class: "card-actions" }, summaryButton);
    if (!finished) {
      const attendButton = h("button", { class: "button", type: "button" }, "Atender consulta");
      attendButton.addEventListener("click", () => this.#emit("ofiuco:consulta-select"));
      actions.append(attendButton);
    }

    const meta = h("div", { class: "card-meta" },
      h("ofiuco-simple-info", { etiqueta: "Paciente", valor: getPatientName(consulta) }),
      h("ofiuco-simple-info", { etiqueta: "Inicio", valor: formatDate(consulta.fechaInicio) })
    );
    if (finished) {
      meta.append(h("ofiuco-simple-info", { etiqueta: "Finalización", valor: formatDate(consulta.fechaFin) }));
    }
    meta.append(h("ofiuco-simple-info", { etiqueta: "Procedimientos", valor: String(procedures) }));

    this.#container.replaceChildren(
      h("article", { class: "consultation-card" },
        h("div", { class: "card-top" },
          h("h3", { class: "card-reference" }, `Consulta ${reference}`),
          h("span", { class: finished ? "state done" : "state" }, finished ? "Finalizada" : "Pendiente")
        ),
        meta,
        actions
      )
    );
  }

  /**
   * Despacha un evento personalizado con burbujeo y cruce del Shadow DOM adjuntando
   * la consulta actual en `detail.consulta`.
   *
   * @param {string} name - Nombre del evento a emitir (`"ofiuco:consulta-resumen"` o `"ofiuco:consulta-select"`).
   */
  #emit(name) {
    this.dispatchEvent(new CustomEvent(name, {
      detail: { consulta: this.#consulta }, bubbles: true, composed: true
    }));
  }
}

defineOnce("ofiuco-consulta-card", OfiucoConsultaCard);
export default OfiucoConsultaCard;