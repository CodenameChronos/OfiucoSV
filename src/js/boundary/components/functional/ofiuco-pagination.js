/**
 * @fileoverview Web Component `<ofiuco-pagination>` para controles de paginación.
 * Calcula el total de páginas a partir de `total` y `page-size`, muestra el rango de
 * elementos visibles junto con botones "Anterior" y "Siguiente", y despacha el evento
 * `ofiuco:page-change` con el índice base 0 de la nueva página solicitada.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

/**
 * Resuelve la URL absoluta de una hoja de estilos ubicada en el directorio `components`.
 *
 * @param {string} name - Nombre del archivo CSS (ej. `"pagination.css"`).
 * @returns {string} URL resuelta de la hoja de estilos.
 */
const styleUrl = (name) =>
  new URL(`../../../../resources/styles/components/${name}`, import.meta.url).href;

/**
 * Componente web `<ofiuco-pagination>`.
 *
 * Atributos soportados:
 * - `page`: Índice de la página actual (base 0).
 * - `page-size`: Cantidad de registros mostrados por página (mínimo `1`).
 * - `total`: Número total de registros disponibles (mínimo `0`).
 * - `label`: Etiqueta accesible `aria-label` del elemento `<nav>` (por defecto `"Paginación"`).
 *
 * Si `total <= pageSize`, el componente oculta/limpia su contenido automáticamente.
 * Al interactuar con los botones de navegación, emite el evento `ofiuco:page-change`
 * (`bubbles: true`, `composed: true`) con `detail: { page }`.
 *
 * @extends BaseComponent
 * @fires CustomEvent#ofiuco:page-change
 */
export class OfiucoPagination extends BaseComponent {
  /**
   * Lista de atributos HTML observados para actualizar la vista reactivamente.
   * @type {string[]}
   */
  static observedAttributes = ["page", "page-size", "total", "label"];

  /**
   * Hojas de estilo asociadas al Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [styleUrl("button.css"), styleUrl("pagination.css")];

  #nav;

  get page() {
    return this.#number("page", 0);
  }

  set page(value) {
    this.setAttribute("page", String(value));
  }

  get pageSize() {
    return Math.max(1, this.#number("page-size", 1));
  }

  set pageSize(value) {
    this.setAttribute("page-size", String(value));
  }

  get total() {
    return Math.max(0, this.#number("total", 0));
  }

  set total(value) {
    this.setAttribute("total", String(value));
  }

  /**
   * Construye el contenedor `<nav>` dentro del Shadow DOM y renderiza el estado inicial.
   */
  render() {
    this.#nav = h("nav", { class: "pagination" });
    this.shadowRoot.append(this.#nav);
    this.#paint();
  }

  /**
   * Callback nativo de Custom Elements ejecutado cuando cambia algún atributo observado.
   * Redibuja los controles de paginación si el componente ya fue renderizado.
   */
  attributeChangedCallback() {
    if (this.rendered) this.#paint();
  }

  /**
   * Lee y parsea como entero base 10 un atributo numérico del elemento, devolviendo
   * un valor por defecto si el atributo no existe o no es un número válido.
   *
   * @param {string} name - Nombre del atributo HTML.
   * @param {number} fallback - Valor por defecto si el parseo resulta en `NaN`.
   * @returns {number} Valor entero parseado o `fallback`.
   */
  #number(name, fallback) {
    const parsed = Number.parseInt(this.getAttribute(name) ?? "", 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  /**
   * Calcula el número de páginas, acota la página actual dentro del rango válido
   * `[0, pageCount - 1]` y actualiza el DOM interno del componente con la información
   * de rango y los botones `"Anterior"` y `"Siguiente"`.
   */
  #paint() {
    this.#nav.setAttribute("aria-label", this.getAttribute("label") || "Paginación");

    const { pageSize, total } = this;
    if (total <= pageSize) {
      this.#nav.replaceChildren();
      return;
    }

    const pageCount = Math.ceil(total / pageSize);
    const page = Math.min(Math.max(0, this.page), pageCount - 1);
    const start = page * pageSize;

    const previous = h("button", {
      class: "button secondary", type: "button", disabled: page === 0
    }, "Anterior");
    const next = h("button", {
      class: "button secondary", type: "button", disabled: page >= pageCount - 1
    }, "Siguiente");

    previous.addEventListener("click", () => this.#emit(page - 1));
    next.addEventListener("click", () => this.#emit(page + 1));

    this.#nav.replaceChildren(
      h("span", { class: "pagination-info" },
        `Mostrando ${start + 1}–${Math.min(start + pageSize, total)} de ${total}`),
      h("div", { class: "pagination-actions" },
        previous,
        h("span", { class: "pagination-current" }, `Página ${page + 1} de ${pageCount}`),
        next
      )
    );
  }

  /**
   * Despacha el evento personalizado `ofiuco:page-change` con el nuevo índice de página
   * atravesando el límite del Shadow DOM (`composed: true`) y burbujeando (`bubbles: true`).
   *
   * @param {number} page - Índice base 0 de la página seleccionada.
   */
  #emit(page) {
    this.dispatchEvent(new CustomEvent("ofiuco:page-change", {
      detail: { page }, bubbles: true, composed: true
    }));
  }
}

defineOnce("ofiuco-pagination", OfiucoPagination);
export default OfiucoPagination;