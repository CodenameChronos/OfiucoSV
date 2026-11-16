import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import "./ofiuco-icon.js";

const stylesUrl = new URL(
  "../../../../resources/styles/components/avatar.css",
  import.meta.url,
).href;

/**
 * <ofiuco-avatar [label="Sin fotografía"]>
 *
 * Foto genérica (silueta) igual para todos los pacientes. Es una imagen con
 * texto alternativo (`label`); el tamaño se ajusta con --avatar-size.
 */
export class OfiucoAvatar extends BaseComponent {
  static styleUrls = [stylesUrl];
  static observedAttributes = ["label"];

  #contenedor;

  render() {
    this.#contenedor = h(
      "div",
      { class: "avatar", role: "img" },
      h("ofiuco-icon", { name: "user" }),
    );
    this.shadowRoot.append(this.#contenedor);
    this.#sincronizar();
  }

  attributeChangedCallback() {
    if (this.rendered) this.#sincronizar();
  }

  #sincronizar() {
    this.#contenedor.setAttribute(
      "aria-label",
      this.getAttribute("label") || "Sin fotografía",
    );
  }
}

defineOnce("ofiuco-avatar", OfiucoAvatar);
export default OfiucoAvatar;
