import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { BUTTON_CLICK } from "../functional/ofiuco-button.js";

const stylesUrl = new URL(
  "../../../../resources/styles/components/confirm_dialog.css",
  import.meta.url,
).href;

/**
 * <ofiuco-confirm-dialog>
 *
 * Diálogo modal de confirmación basado en <dialog> nativo (foco atrapado,
 * Esc para cerrar y backdrop sin código extra).
 *
 * Uso típico con ConfirmacionRequerida del AtencionService:
 *
 *   try { await servicio.avanzar(borrador); }
 *   catch (error) {
 *     if (!(error instanceof ConfirmacionRequerida)) throw error;
 *     if (await dialogo.preguntar({ avisos: error.avisos }))
 *       await servicio.avanzar(borrador, { confirmado: true });
 *   }
 *
 * `preguntar()` devuelve una promesa: true si el usuario acepta; false si
 * cancela, pulsa Esc, hace clic fuera o si se abre otra pregunta encima.
 */
export class OfiucoConfirmDialog extends BaseComponent {
  static styleUrls = [stylesUrl];

  #dialog;
  #titulo;
  #avisos;
  #pregunta;
  #aceptar;
  #cancelar;
  #resolver = null;

  render() {
    const idTitulo = `ofiuco-dlg-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

    this.#titulo = h("h2", { class: "dialogo__titulo", id: idTitulo });
    this.#avisos = h("ul", { class: "dialogo__avisos" });
    this.#pregunta = h("p", { class: "dialogo__pregunta" });
    this.#cancelar = h("ofiuco-button", {
      variant: "secondary",
      "data-accion": "cancelar",
    });
    this.#aceptar = h("ofiuco-button", {
      variant: "primary",
      "data-accion": "aceptar",
    });

    this.#cancelar.addEventListener(BUTTON_CLICK, () => this.#cerrar(false));
    this.#aceptar.addEventListener(BUTTON_CLICK, () => this.#cerrar(true));

    this.#dialog = h(
      "dialog",
      { class: "dialogo", "aria-labelledby": idTitulo },
      h(
        "div",
        { class: "dialogo__contenido" },
        this.#titulo,
        this.#avisos,
        this.#pregunta,
        h("div", { class: "dialogo__acciones" }, this.#cancelar, this.#aceptar),
      ),
    );

    // Esc o dialog.close(): el navegador cierra y notifica con "close".
    this.#dialog.addEventListener("close", () => this.#cerrar(false));
    // Clic en el backdrop: el objetivo es el propio <dialog>, no su contenido.
    this.#dialog.addEventListener("click", (evento) => {
      if (evento.target === this.#dialog) this.#cerrar(false);
    });

    this.shadowRoot.append(this.#dialog);
  }

  onDisconnect() {
    this.#cerrar(false);
  }

  /**
   * @param {Object} [opciones]
   * @param {string} [opciones.titulo]
   * @param {string[]} [opciones.avisos] mensajes que se listan (texto plano)
   * @param {string} [opciones.pregunta]
   * @param {string} [opciones.aceptar] etiqueta del botón de confirmación
   * @param {string} [opciones.cancelar] etiqueta del botón de cancelación
   * @returns {Promise<boolean>}
   */
  preguntar({
    titulo = "Confirmar acción",
    avisos = [],
    pregunta = "¿Desea continuar?",
    aceptar = "Continuar",
    cancelar = "Cancelar",
  } = {}) {
    this.#resolver?.(false);

    this.#titulo.textContent = titulo;
    this.#avisos.replaceChildren(
      ...avisos.map((aviso) => h("li", {}, String(aviso))),
    );
    this.#avisos.hidden = avisos.length === 0;
    this.#pregunta.textContent = pregunta;
    this.#aceptar.setAttribute("label", aceptar);
    this.#cancelar.setAttribute("label", cancelar);

    return new Promise((resolve) => {
      this.#resolver = resolve;
      if (!this.#dialog.open) this.#dialog.showModal();
      // El foco inicia en la acción segura (cancelar).
      this.#cancelar.focus();
    });
  }

  #cerrar(resultado) {
    const resolver = this.#resolver;
    this.#resolver = null;
    if (this.#dialog?.open) this.#dialog.close();
    resolver?.(resultado);
  }
}

defineOnce("ofiuco-confirm-dialog", OfiucoConfirmDialog);
export default OfiucoConfirmDialog;
