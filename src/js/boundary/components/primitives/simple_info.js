import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

const stylesUrl = new URL(
  "../../../../resources/styles/components/simple_info.css",
  import.meta.url,
).href;

export class SimpleInfo extends BaseComponent {
  static styleUrls = [stylesUrl];

  static get observedAttributes() {
    return ["etiqueta", "valor"];
  }

  #etiquetaEl;
  #valorEl;

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

  attributeChangedCallback() {
    if (this.rendered) {
      this.#sincronizar();
    }
  }

  #sincronizar() {
    const etiqueta = this.getAttribute("etiqueta")?.trim() ?? "";
    this.#etiquetaEl.textContent = etiqueta ? `${etiqueta}:` : "";
    this.#valorEl.textContent = this.getAttribute("valor") ?? "";
  }
}

defineOnce("ofiuco-simple-info", SimpleInfo);
export default SimpleInfo;