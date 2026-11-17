/**
 * @fileoverview Web Component `<ofiuco-resume-element>` que renderiza un ítem
 * de resumen interactivo con título, subtítulo, fecha, botón de acción secundaria,
 * ranura `<slot name="acciones">` y estados visuales configurables por atributos.
 * Emite eventos personalizados al seleccionar el elemento (`ofiuco:resume-select`)
 * o al pulsar su botón de acción (`ofiuco:resume-ver-registro`).
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

/** @type {string} URL resuelta de la hoja de estilos asociada al elemento de resumen. */
const stylesUrl = new URL(
  "../../../../resources/styles/components/resume_element.css",
  import.meta.url,
).href;

/**
 * Componente web `<ofiuco-resume-element [titulo] [subtitulo] [fecha] [accion] [estado] [seleccionado]>`.
 *
 * Representa una fila o tarjeta compacta de resumen dentro de listados clínicos.
 * Puede configurarse tanto mediante atributos HTML individuales como asignando
 * un objeto estructurado a la propiedad `item`.
 *
 * Eventos emitidos (`bubbles: true`, `composed: true`) con `detail: { titulo, item }`:
 * - `ofiuco:resume-select`: Al hacer clic sobre el contenedor principal del ítem.
 * - `ofiuco:resume-ver-registro`: Al hacer clic en el botón de acción lateral (detiene la propagación del clic).
 *
 * @extends BaseComponent
 * @fires CustomEvent#ofiuco:resume-select
 * @fires CustomEvent#ofiuco:resume-ver-registro
 */
export class ResumeElement extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [stylesUrl];

  /**
   * Lista de atributos HTML observados para actualizar la vista reactivamente.
   * @returns {string[]}
   */
  static get observedAttributes() {
    return ["titulo", "subtitulo", "fecha", "accion", "estado", "seleccionado"];
  }

  #tituloEl;
  #subtituloEl;
  #fechaEl;
  #accionBtn;
  #data = null;

  /**
   * Construye la estructura DOM del ítem dentro del Shadow DOM (bloque informativo,
   * bloque lateral con fecha, botón de acción y `<slot name="acciones">`), registra
   * los manejadores de clic para emitir los eventos correspondientes y sincroniza los atributos.
   */
  render() {
    this.#tituloEl = h("p", { class: "resume-item__titulo" });
    this.#subtituloEl = h("p", { class: "resume-item__subtitulo" });
    this.#fechaEl = h("span", { class: "resume-item__fecha" });
    this.#accionBtn = h("button", {
      type: "button",
      class: "resume-item__btn",
    });

    this.#accionBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.dispatchEvent(
        new CustomEvent("ofiuco:resume-ver-registro", {
          detail: {
            titulo: this.getAttribute("titulo") ?? "",
            item: this.#data,
          },
          bubbles: true,
          composed: true,
        }),
      );
    });

    const info = h(
      "div",
      { class: "resume-item__info" },
      this.#tituloEl,
      this.#subtituloEl,
    );

    const lateral = h(
      "div",
      { class: "resume-item__lateral" },
      this.#fechaEl,
      this.#accionBtn,
      h("slot", { name: "acciones" }),
    );

    const contenedor = h(
      "div",
      { class: "resume-item", role: "button", tabindex: "0" },
      info,
      lateral,
    );

    contenedor.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("ofiuco:resume-select", {
          detail: {
            titulo: this.getAttribute("titulo") ?? "",
            item: this.#data,
          },
          bubbles: true,
          composed: true,
        }),
      );
    });

    this.shadowRoot.append(contenedor);
    this.#sincronizar();
  }

  /**
   * Callback nativo de Custom Elements ejecutado cuando cambia cualquiera de los
   * atributos observados. Actualiza el contenido visual si el componente ya fue renderizado.
   */
  attributeChangedCallback() {
    if (this.rendered) {
      this.#sincronizar();
    }
  }

  set item(valor) {
    this.#data = valor ?? null;
    if (!valor) return;
    if (valor.titulo != null) this.setAttribute("titulo", valor.titulo);
    if (valor.subtitulo != null) this.setAttribute("subtitulo", valor.subtitulo);
    if (valor.fecha != null) this.setAttribute("fecha", valor.fecha);
    if (valor.accion != null) this.setAttribute("accion", valor.accion);
    if (valor.estado != null) this.setAttribute("estado", valor.estado);
  }

  get item() {
    return this.#data;
  }

  /**
   * Sincroniza el texto visible de `#tituloEl`, `#subtituloEl`, `#fechaEl` y
   * `#accionBtn` a partir de los atributos HTML actuales del componente.
   */
  #sincronizar() {
    this.#tituloEl.textContent = this.getAttribute("titulo") ?? "";
    this.#subtituloEl.textContent = this.getAttribute("subtitulo") ?? "";
    this.#fechaEl.textContent = this.getAttribute("fecha") ?? "";
    this.#accionBtn.textContent = this.getAttribute("accion") ?? "";
  }
}

defineOnce("ofiuco-resume-element", ResumeElement);
export default ResumeElement;