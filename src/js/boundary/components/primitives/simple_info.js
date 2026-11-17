/**
 * @fileoverview Web Component `<ofiuco-simple-info>` que renderiza un par clave-valor
 * compacto (`etiqueta: valor`) dentro de un contenedor estructurado en el Shadow DOM.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

/** @type {string} URL resuelta de la hoja de estilos asociada al componente de información simple. */
const stylesUrl = new URL(
  "../../../../resources/styles/components/simple_info.css",
  import.meta.url,
).href;

/**
 * Componente web `<ofiuco-simple-info [etiqueta] [valor]>`.
 *
 * Muestra un dato informativo acompañado de su etiqueta descriptiva seguida de dos puntos
 * (`:`). Si la etiqueta está vacía o ausente, omite los dos puntos y muestra únicamente el valor.
 *
 * Atributos observados:
 * - `etiqueta`: Nombre descriptivo del campo o metadato.
 * - `valor`: Contenido textual asociado a la etiqueta.
 *
 * @extends BaseComponent
 */
export class SimpleInfo extends BaseComponent {
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
    return ["etiqueta", "valor"];
  }

  #etiquetaEl;
  #valorEl;

  /**
   * Construye la estructura DOM del par etiqueta-valor dentro del Shadow DOM
   * (`<div class="simple-info">` con dos `<span>`) y sincroniza los atributos iniciales.
   */
  render() {
    this.#etiquetaEl = h("span", { class: "simple-info__etiqueta" });
    this.#valorEl = h("span", { class: "simple-info__valor" });

    const contenedor = h(
      "div",
      { class: "simple-info" },
      this.#etiquetaEl,
      this.#valorEl,
    );

    this.shadowRoot.append(contenedor);
    this.#sincronizar();
  }

  /**
   * Callback nativo de Custom Elements ejecutado cuando cambia `etiqueta` o `valor`.
   * Actualiza el texto renderizado si el componente ya se encuentra montado.
   */
  attributeChangedCallback() {
    if (this.rendered) {
      this.#sincronizar();
    }
  }

  /**
   * Sincroniza el contenido de `#etiquetaEl` (añadiendo `:` si no está vacía) y
   * `#valorEl` a partir de los atributos HTML actuales del elemento.
   */
  #sincronizar() {
    const etiqueta = this.getAttribute("etiqueta")?.trim() ?? "";
    this.#etiquetaEl.textContent = etiqueta ? `${etiqueta}:` : "";
    this.#valorEl.textContent = this.getAttribute("valor") ?? "";
  }
}

defineOnce("ofiuco-simple-info", SimpleInfo);
export default SimpleInfo;