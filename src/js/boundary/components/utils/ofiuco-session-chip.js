import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { isValidSession } from "../../core/session-events.js";

/**
 * <ofiuco-session-chip>
 *
 * Muestra quién tiene la sesión activa: nombre y, debajo, "rol · clínica".
 * Sin sesión (o con un modelo inválido) el componente se oculta por completo.
 *
 * Propiedad: `session` -> {nombre, rol?, clinica?} | null
 */
export class OfiucoSessionChip extends BaseComponent {
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/session_chip.css",
      import.meta.url,
    ).href,
  ];

  /** @type {import('../../core/session-events.js').Session|null} */
  #session = null;
  #nameEl;
  #detailEl;

  get session() {
    return this.#session;
  }

  set session(value) {
    this.#session = isValidSession(value) ? value : null;
    if (this.rendered) this.#paint();
  }

  render() {
    this.#nameEl = h("span", { class: "nombre" });
    this.#detailEl = h("span", { class: "detalle" });
    this.shadowRoot.append(this.#nameEl, this.#detailEl);
    this.#paint();
  }

  #paint() {
    const session = this.#session;
    const detail = session
      ? [session.rol, session.clinica].filter(Boolean).join(" · ")
      : "";

    this.hidden = session === null;
    this.#nameEl.textContent = session?.nombre ?? "";
    this.#detailEl.textContent = detail;
    this.#detailEl.hidden = detail === "";
    this.title = session
      ? [session.nombre, detail].filter(Boolean).join(" — ")
      : "";
  }
}

defineOnce("ofiuco-session-chip", OfiucoSessionChip);

export default OfiucoSessionChip;
