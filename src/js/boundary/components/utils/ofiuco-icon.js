import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { ICONS } from "./icons.js";

/**
 * <ofiuco-icon name="logout" label="Cerrar sesión">
 *
 * Atributos:
 *  - name:  clave del registro ICONS. Si no existe, se dibuja un svg vacío.
 *  - label: texto accesible. Sin label el ícono es decorativo (aria-hidden).
 *
 * Tamaño: variable CSS --icon-size (1.5rem por defecto). Color: currentColor.
 */
export class OfiucoIcon extends BaseComponent {
  static observedAttributes = ["name", "label"];

  static styleUrls = [
    new URL("../../../../resources/styles/components/icon.css", import.meta.url)
      .href,
  ];

  #svg = null;

  render() {
    this.#paint();
  }

  attributeChangedCallback() {
    if (this.rendered) this.#paint();
  }

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
