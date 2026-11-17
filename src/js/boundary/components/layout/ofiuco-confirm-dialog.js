/**
 * @fileoverview Web Component `<ofiuco-confirm-dialog>` que implementa un diálogo
 * modal de confirmación sobre el elemento nativo `<dialog>`. Gestiona de forma
 * asíncrona preguntas de confirmación con listado opcional de avisos mediante
 * promesas (`preguntar()`), asegurando accesibilidad, cierre con tecla `Esc` o clic
 * en el backdrop, y foco inicial en la acción segura de cancelación.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { BUTTON_CLICK } from "../functional/ofiuco-button.js";

/** @type {string} URL resuelta de la hoja de estilos asociada al diálogo de confirmación. */
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
 * @extends BaseComponent
 */
export class OfiucoConfirmDialog extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [stylesUrl];

  #dialog;
  #titulo;
  #avisos;
  #pregunta;
  #aceptar;
  #cancelar;
  #resolver = null;

  /**
   * Construye la estructura DOM del diálogo modal dentro del Shadow DOM,
   * configura los botones `<ofiuco-button>` de confirmación/cancelación y
   * registra los manejadores para cierre nativo (`close`) y clic en el backdrop.
   */
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

  /**
   * Ciclo de vida ejecutado al desconectar el componente del DOM.
   * Cierra el diálogo y resuelve con `false` cualquier promesa pendiente.
   */
  onDisconnect() {
    this.#cerrar(false);
  }

  /**
   * Abre el diálogo modal con los textos configurados y espera la respuesta del usuario.
   * Si existía una consulta previa abierta, la resuelve inmediatamente con `false`.
   *
   * @param {Object} [opciones] - Configuración textual del cuadro de diálogo.
   * @param {string} [opciones.titulo="Confirmar acción"] - Título principal del modal.
   * @param {string[]} [opciones.avisos=[]] - Mensajes de advertencia que se listan en texto plano.
   * @param {string} [opciones.pregunta="¿Desea continuar?"] - Texto de confirmación final.
   * @param {string} [opciones.aceptar="Continuar"] - Etiqueta del botón de confirmación.
   * @param {string} [opciones.cancelar="Cancelar"] - Etiqueta del botón de cancelación.
   * @returns {Promise<boolean>} Promesa que resuelve a `true` si se confirma o `false` si se cancela/cierra.
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

  /**
   * Cierra el `<dialog>` nativo si está abierto y resuelve la promesa activa con el
   * resultado booleano indicado, evitando resoluciones duplicadas.
   *
   * @param {boolean} resultado - Resultado de la interacción (`true` aceptado, `false` cancelado/cerrado).
   */
  #cerrar(resultado) {
    const resolver = this.#resolver;
    this.#resolver = null;
    if (this.#dialog?.open) this.#dialog.close();
    resolver?.(resultado);
  }
}

defineOnce("ofiuco-confirm-dialog", OfiucoConfirmDialog);
export default OfiucoConfirmDialog;