/**
 * @fileoverview Web Component `<ofiuco-icon>` encargado de renderizar íconos vectoriales
 * SVG (`viewBox="0 0 24 24"`) a partir del catálogo centralizado `ICONS`. Gestiona
 * automáticamente la accesibilidad ARIA según si el ícono es informativo (`label`)
 * o puramente decorativo (`aria-hidden="true"`).
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { ICONS } from "./icons.js";

/**
 * Componente web `<ofiuco-icon name="logout" [label="Cerrar sesión"]>`.
 *
 * Atributos:
 * - `name`: clave del registro `ICONS`. Si no existe, se dibuja un `<svg>` vacío.
 * - `label`: texto accesible. Sin `label` el ícono es decorativo (`aria-hidden="true"`).
 *
 * Tamaño: variable CSS `--icon-size` (`1.5rem` por defecto). Color: `currentColor`.
 *
 * @extends BaseComponent
 */
export class OfiucoIcon extends BaseComponent {
  /**
   * Lista de atributos HTML observados para volver a dibujar el SVG reactivamente.
   * @type {string[]}
   */
  static observedAttributes = ["name", "label"];

  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [
    new URL("../../../../resources/styles/components/icon.css", import.meta.url)
      .href,
  ];

  #svg = null;

  /**
   * Ejecuta el pintado inicial del elemento SVG dentro del Shadow DOM.
   */
  render() {
    this.#paint();
  }

  /**
   * Callback nativo de Custom Elements ejecutado cuando cambia `name` o `label`.
   * Reconstruye el SVG si el componente ya fue renderizado.
   */
  attributeChangedCallback() {
    if (this.rendered) this.#paint();
  }

  /**
   * Construye el elemento `<svg viewBox="0 0 24 24" focusable="false">` con el
   * contenido vectorial correspondiente a `name` en `ICONS`, configura los atributos
   * ARIA (`role="img"` y `aria-label` o `aria-hidden="true"`) y reemplaza el SVG previo.
   */
  #paint() {
    const name = this.getAttribute("name");
    const label = this.getAttribute("label");
    const body = Object.hasOwn(ICONS, name) ? ICONS[name] : "";

    const template = document.createElement("template");
    template.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${body}</svg>`;
    const svg = template.content.firstElementChild;

    if (label) {
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", label);
    } else {
      svg.setAttribute("aria-hidden", "true");
    }
    this.#svg?.remove();
    this.#svg = svg;
    this.shadowRoot.append(svg);
  }
}

defineOnce("ofiuco-icon", OfiucoIcon);

export default OfiucoIcon;