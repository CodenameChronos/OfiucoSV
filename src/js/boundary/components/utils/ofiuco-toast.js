import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { BUTTON_CLICK } from "../functional/ofiuco-button.js";

const stylesUrl = new URL(
  "../../../../resources/styles/components/toast.css",
  import.meta.url,
).href;

const TIPOS = ["info", "exito", "error"];
const DURACION_POR_DEFECTO = 5000;

/**
 * <ofiuco-toast>
 *
 * Notificaciones apiladas en la esquina de la pantalla.
 *
 *   toast.mostrar({ tipo: "exito", mensaje: "Cambios guardados" });
 *   toast.mostrar({ tipo: "error", mensaje: error.message });
 *
 * Tipos: info | exito | error. Los errores usan role="alert" (se anuncian de
 * inmediato) y NO se cierran solos: el usuario debe poder leerlos. El resto
 * usa role="status" y se cierra a los 5 s (o `duracion` ms; 0 = permanente).
 * Se muestran como máximo 4 a la vez; al superarlas se descartan las más viejas.
 * El mensaje se inserta siempre como texto, nunca como HTML.
 */
export class OfiucoToast extends BaseComponent {
  static styleUrls = [stylesUrl];
  static MAX_VISIBLES = 4;

  #lista;
  #temporizadores = new Map();
  #siguienteId = 1;

  render() {
    this.#lista = h("ul", { class: "toasts", "aria-label": "Notificaciones" });
    this.shadowRoot.append(this.#lista);
  }

  onDisconnect() {
    this.limpiar();
  }

  /**
   * @param {Object} opciones
   * @param {string} opciones.mensaje
   * @param {"info"|"exito"|"error"} [opciones.tipo="info"]
   * @param {number} [opciones.duracion] ms; 0 = no se cierra solo
   * @returns {number} id para cerrarlo con cerrar(id)
   */
  mostrar({ mensaje, tipo = "info", duracion } = {}) {
    const tipoValido = TIPOS.includes(tipo) ? tipo : "info";
    const ms = duracion ?? (tipoValido === "error" ? 0 : DURACION_POR_DEFECTO);
    const id = this.#siguienteId++;

    const cerrar = h("ofiuco-button", {
      icon: "close",
      "icon-only": true,
      label: "Cerrar notificación",
      variant: "secondary",
    });
    cerrar.addEventListener(BUTTON_CLICK, (evento) => {
      evento.stopPropagation();
      this.cerrar(id);
    });

    this.#lista.append(
      h(
        "li",
        {
          class: `toast toast--${tipoValido}`,
          role: tipoValido === "error" ? "alert" : "status",
          "data-id": id,
        },
        h("p", { class: "toast__mensaje" }, String(mensaje ?? "")),
        cerrar,
      ),
    );

    while (this.#lista.children.length > OfiucoToast.MAX_VISIBLES) {
      this.cerrar(Number(this.#lista.firstElementChild.dataset.id));
    }

    if (ms > 0) {
      this.#temporizadores.set(
        id,
        setTimeout(() => this.cerrar(id), ms),
      );
    }
    return id;
  }

  /** Cierra una notificación (no hace nada si ya no existe). */
  cerrar(id) {
    clearTimeout(this.#temporizadores.get(id));
    this.#temporizadores.delete(id);
    this.#lista?.querySelector(`[data-id="${id}"]`)?.remove();
  }

  /** Cierra todas y libera los temporizadores. */
  limpiar() {
    for (const temporizador of this.#temporizadores.values()) {
      clearTimeout(temporizador);
    }
    this.#temporizadores.clear();
    this.#lista?.replaceChildren();
  }
}

defineOnce("ofiuco-toast", OfiucoToast);
export default OfiucoToast;
