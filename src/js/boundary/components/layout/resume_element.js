import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

const stylesUrl = new URL(
  "../../../../resources/styles/components/resume_element.css",
  import.meta.url,
).href;

export class ResumeElement extends BaseComponent {
  static styleUrls = [stylesUrl];

  static get observedAttributes() {
    return ["titulo", "subtitulo", "fecha", "accion", "estado", "seleccionado"];
  }

  #tituloEl;
  #subtituloEl;
  #fechaEl;
  #accionBtn;
  #data = null;

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

  #sincronizar() {
    this.#tituloEl.textContent = this.getAttribute("titulo") ?? "";
    this.#subtituloEl.textContent = this.getAttribute("subtitulo") ?? "";
    this.#fechaEl.textContent = this.getAttribute("fecha") ?? "";
    this.#accionBtn.textContent = this.getAttribute("accion") ?? "";
  }
}

defineOnce("ofiuco-resume-element", ResumeElement);
export default ResumeElement;
