import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

const stylesUrl = new URL(
  "../../../../resources/styles/components/dialog.css",
  import.meta.url,
).href;

export class OfiucoDialog extends BaseComponent {
  static observedAttributes = ["eyebrow", "heading"];

  static styleUrls = [stylesUrl];

  #eyebrowEl;
  #headingEl;
  #closeButton;

  render() {
    this.#eyebrowEl = h("p", { class: "eyebrow" });
    this.#headingEl = h("h2", { id: "dialog-title" });
    this.#closeButton = h("button", {
      class: "dialog-close", type: "button", "aria-label": "Cerrar"
    }, "×");
    this.#closeButton.addEventListener("click", () => this.#close());

    const backdrop = h("div", { class: "dialog-backdrop" },
      h("section", {
        class: "dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "dialog-title"
      },
        h("header", { class: "dialog-head" },
          h("div", {}, this.#eyebrowEl, this.#headingEl),
          this.#closeButton
        ),
        h("div", { class: "dialog-body" }, h("slot"))
      )
    );

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) this.#close();
    });
    this.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.#close();
    });

    this.shadowRoot.append(backdrop);
    this.#sincronizar();
  }

  onConnect() {
    this.#closeButton?.focus();
  }

  attributeChangedCallback() {
    if (this.rendered) this.#sincronizar();
  }

  #sincronizar() {
    this.#eyebrowEl.textContent = this.getAttribute("eyebrow") ?? "";
    this.#headingEl.textContent = this.getAttribute("heading") ?? "";
  }

  #close() {
    this.dispatchEvent(new CustomEvent("ofiuco:dialog-close", { bubbles: true, composed: true }));
  }
}

defineOnce("ofiuco-dialog", OfiucoDialog);
export default OfiucoDialog;
