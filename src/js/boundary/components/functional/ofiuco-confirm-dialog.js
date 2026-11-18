/**
 * @fileoverview Web Component `<ofiuco-confirm-dialog>` para diálogos modales de confirmación.
 * Utiliza el elemento nativo `<dialog>` para gestionar automáticamente el atrapado de foco,
 * cierre con la tecla `Esc` y fondo backdrop, exponiendo una API asíncrona basada en promesas.
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
   * Construye la estructura DOM del diálogo modal dentro del Shadow DOM
   * y enlaza los eventos de confirmación, cancelación, tecla `Esc` y clic en el backdrop.
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
   * Ciclo de vida ejecutado cuando el componente se desconecta del DOM.
   * Cierra el diálogo y resuelve con `false` cualquier confirmación pendiente.
   */
  onDisconnect() {
    this.#cerrar(false);
  }

  /**
   * Configura el contenido textual del diálogo, lo despliega de forma modal (`showModal()`)
   * y enfoca inicialmente el botón de cancelar como medida preventiva.
   * Si existía una promesa anterior sin resolver, la resuelve automáticamente con `false`.
   *
   * @param {Object} [opciones={}] - Configuración del mensaje y etiquetas del diálogo.
   * @param {string} [opciones.titulo="Confirmar acción"] - Encabezado principal del modal.
   * @param {string[]} [opciones.avisos=[]] - Lista de mensajes de advertencia o detalle (en texto plano).
   * @param {string} [opciones.pregunta="¿Desea continuar?"] - Texto de la pregunta de confirmación.
   * @param {string} [opciones.aceptar="Continuar"] - Etiqueta del botón de confirmación.
   * @param {string} [opciones.cancelar="Cancelar"] - Etiqueta del botón de cancelación.
   * @returns {Promise<boolean>} Promesa que se resuelve en `true` si el usuario confirma o `false` en cualquier otro caso.
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
   * Cierra el elemento `<dialog>` si permanece abierto y resuelve la promesa pendiente
   * asegurando que `#resolver` se limpie antes de cerrar para evitar doble invocación
   * desde el evento nativo `close`.
   *
   * @param {boolean} resultado - Resultado booleano con el que se resolverá la promesa.
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