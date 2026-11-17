/**
 * @fileoverview Web Component `<ofiuco-sidebar>` que actúa como contenedor lateral
 * de navegación o herramientas auxiliares mediante proyección de contenido (`<slot>`)
 * dentro de un elemento semántico `<aside>`.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

/** @type {string} URL resuelta de la hoja de estilos asociada a la barra lateral. */
const stylesUrl = new URL(
  "../../../../resources/styles/components/sidebar.css",
  import.meta.url,
).href;

/**
 * Componente web `<ofiuco-sidebar>`.
 *
 * Contenedor estructural de barra lateral (`<aside class="sidebar">`) que proyecta
 * cualquier contenido hijo definido en el Light DOM a través de su `<slot>` por defecto.
 *
 * @extends BaseComponent
 */
export class Sidebar extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [stylesUrl];

  /**
   * Construye la estructura DOM de la barra lateral dentro del Shadow DOM
   * (`<aside class="sidebar">` con un `<slot>` por defecto).
   */
  render() {
    const contenedor = h("aside", { class: "sidebar" }, h("slot"));
    this.shadowRoot.append(contenedor);
  }
}

defineOnce("ofiuco-sidebar", Sidebar);
export default Sidebar;