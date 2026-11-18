/**
 * @fileoverview Web Component `<ofiuco-session-chip>` que muestra de forma compacta
 * los datos de la sesión activa del usuario (nombre principal y detalle secundario
 * `"rol · clínica"`). Valida el objeto de sesión mediante `isValidSession` y se oculta
 * automáticamente cuando no existe una sesión válida.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { isValidSession } from "../../core/session-events.js";

/**
 * Componente web `<ofiuco-session-chip>`.
 *
 * Muestra quién tiene la sesión activa: nombre y, debajo, `"rol · clínica"`.
 * Sin sesión (o con un modelo inválido) el componente se oculta por completo (`hidden = true`).
 *
 * Propiedad: `session` -> `{nombre, rol?, clinica?} | null`
 *
 * @extends BaseComponent
 */
export class OfiucoSessionChip extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/session_chip.css",
      import.meta.url,
    ).href,
  ];

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

  /**
   * Construye los elementos `<span>` de nombre y detalle dentro del Shadow DOM
   * y ejecuta el pintado inicial según el estado de `#session`.
   */
  render() {
    this.#nameEl = h("span", { class: "nombre" });
    this.#detailEl = h("span", { class: "detalle" });
    this.shadowRoot.append(this.#nameEl, this.#detailEl);
    this.#paint();
  }

  /**
   * Sincroniza la visibilidad del componente (`this.hidden`), los textos de `#nameEl`
   * y `#detailEl`, y el atributo `title` (tooltip) en función de `#session`.
   */
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