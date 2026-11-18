/**
 * @fileoverview Web Component `<ofiuco-dialog>` que implementa un contenedor modal
 * accesible con `role="dialog"` y `aria-modal="true"`. Admite subtítulo superior
 * (`eyebrow`), encabezado (`heading`), proyección de contenido arbitrario mediante `<slot>`,
 * cierre al pulsar `Escape`, clic en el fondo (`backdrop`) o en el botón de cierre,
 * y emite el evento `ofiuco:dialog-close`.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

/** @type {string} URL resuelta de la hoja de estilos asociada al componente diálogo. */
const stylesUrl = new URL(
  "../../../../resources/styles/components/dialog.css",
  import.meta.url,
).href;

/**
 * Componente web `<ofiuco-dialog [eyebrow] [heading]>`.
 *
 * Contenedor modal reutilizable que gestiona el encabezado del diálogo, el enfoque
 * inicial en el botón de cierre al conectarse al DOM y los mecanismos de cierre
 * (botón `"×"`, tecla `Escape` o clic fuera del panel del diálogo).
 *
 * Atributos observados:
 * - `eyebrow`: Texto corto o categoría mostrada sobre el título principal.
 * - `heading`: Título principal del diálogo asociado vía `aria-labelledby`.
 *
 * @extends BaseComponent
 * @fires CustomEvent#ofiuco:dialog-close
 */
export class OfiucoDialog extends BaseComponent {
  /**
   * Lista de atributos HTML observados para sincronizar los textos del encabezado.
   * @type {string[]}
   */
  static observedAttributes = ["eyebrow", "heading"];

  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [stylesUrl];

  #eyebrowEl;
  #headingEl;
  #closeButton;

  /**
   * Construye la estructura DOM del diálogo modal dentro del Shadow DOM (`backdrop`,
   * `<section role="dialog">`, encabezado con `eyebrow`/`heading`, botón de cierre y `<slot>`),
   * registra los manejadores de cierre y sincroniza los atributos iniciales.
   */
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

  /**
   * Ciclo de vida ejecutado al conectar el elemento al DOM.
   * Traslada el foco al botón de cierre para garantizar accesibilidad por teclado.
   */
  onConnect() {
    this.#closeButton?.focus();
  }

  /**
   * Callback nativo de Custom Elements ejecutado cuando cambia `eyebrow` o `heading`.
   * Actualiza los textos mostrados si el componente ya fue renderizado.
   */
  attributeChangedCallback() {
    if (this.rendered) this.#sincronizar();
  }

  /**
   * Sincroniza el contenido textual de `#eyebrowEl` y `#headingEl` con los
   * atributos HTML actuales del componente.
   */
  #sincronizar() {
    this.#eyebrowEl.textContent = this.getAttribute("eyebrow") ?? "";
    this.#headingEl.textContent = this.getAttribute("heading") ?? "";
  }

  /**
   * Despacha el evento personalizado `ofiuco:dialog-close` con burbujeo y cruce del
   * Shadow DOM para notificar al contenedor que el usuario solicitó cerrar el diálogo.
   */
  #close() {
    this.dispatchEvent(new CustomEvent("ofiuco:dialog-close", { bubbles: true, composed: true }));
  }
}

defineOnce("ofiuco-dialog", OfiucoDialog);
export default OfiucoDialog;