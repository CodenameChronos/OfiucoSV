import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

const styleUrl = (name) =>
  new URL(`../../../../resources/styles/components/${name}`, import.meta.url).href;


export class OfiucoPagination extends BaseComponent {
  static observedAttributes = ["page", "page-size", "total", "label"];

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

  render() {
    this.#nav = h("nav", { class: "pagination" });
    this.shadowRoot.append(this.#nav);
    this.#paint();
  }

  attributeChangedCallback() {
    if (this.rendered) this.#paint();
  }

  #number(name, fallback) {
    const parsed = Number.parseInt(this.getAttribute(name) ?? "", 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

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

  #emit(page) {
    this.dispatchEvent(new CustomEvent("ofiuco:page-change", {
      detail: { page }, bubbles: true, composed: true
    }));
  }
}

defineOnce("ofiuco-pagination", OfiucoPagination);
export default OfiucoPagination;
