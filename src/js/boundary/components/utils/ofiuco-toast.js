/**
 * @fileoverview Web Component `<ofiuco-toast>` que gestiona una cola visual de
 * notificaciones apiladas (`info`, `exito`, `error`) con soporte para lectores
 * de pantalla mediante roles ARIA (`role="alert"` para errores persistentes y
 * `role="status"` para mensajes informativos o de éxito con cierre automático).
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { BUTTON_CLICK } from "../functional/ofiuco-button.js";

/** @type {string} URL resuelta de la hoja de estilos asociada a las notificaciones toast. */
const stylesUrl = new URL(
  "../../../../resources/styles/components/toast.css",
  import.meta.url,
).href;

/** @type {string[]} Lista blanca de variantes de notificación soportadas. */
const TIPOS = ["info", "exito", "error"];

/** @type {number} Tiempo de visibilidad por defecto en milisegundos para notificaciones no críticas. */
const DURACION_POR_DEFECTO = 5000;

/**
 * Componente web `<ofiuco-toast>`.
 *
 * Tipos: `info` | `exito` | `error`. Los errores usan `role="alert"` (se anuncian de
 * inmediato) y NO se cierran solos: el usuario debe poder leerlos. El resto
 * usa `role="status"` y se cierra a los 5 s (o `duracion` ms; `0` = permanente).
 * Se muestran como máximo 4 a la vez; al superarlas se descartan las más viejas.
 * El mensaje se inserta siempre como texto, nunca como HTML.
 *
 * @extends BaseComponent
 */
export class OfiucoToast extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [stylesUrl];

  /**
   * Límite máximo de notificaciones visibles simultáneamente en pantalla.
   * @type {number}
   */
  static MAX_VISIBLES = 4;

  #lista;
  #temporizadores = new Map();
  #siguienteId = 1;

  /**
   * Construye el contenedor `<ul class="toasts" aria-label="Notificaciones">`
   * dentro del Shadow DOM del componente.
   */
  render() {
    this.#lista = h("ul", { class: "toasts", "aria-label": "Notificaciones" });
    this.shadowRoot.append(this.#lista);
  }

  /**
   * Ciclo de vida ejecutado al desconectar el componente del DOM.
   * Elimina todas las notificaciones visibles y cancela sus temporizadores pendientes.
   */
  onDisconnect() {
    this.limpiar();
  }

  /**
   * Crea y muestra una nueva notificación en la pila visual. Si se supera
   * `OfiucoToast.MAX_VISIBLES`, descarta automáticamente las notificaciones más antiguas.
   *
   * @param {Object} [opciones={}] - Configuración de la notificación a mostrar.
   * @param {string} [opciones.mensaje] - Texto plano del mensaje a mostrar (escapado automáticamente como texto).
   * @param {"info"|"exito"|"error"} [opciones.tipo="info"] - Variante visual y semántica de la notificación.
   * @param {number} [opciones.duracion] - Tiempo en milisegundos antes del cierre automático (`0` evita el cierre automático; por defecto `0` para `"error"` y `5000` para el resto).
   * @returns {number} Identificador único asignado a la notificación para poder cerrarla manualmente con `cerrar(id)`.
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

  /**
   * Cierra una notificación específica eliminando su nodo del DOM y cancelando
   * su temporizador asociado (no realiza ninguna acción si el `id` ya no existe).
   *
   * @param {number} id - Identificador único de la notificación a cerrar.
   */
  cerrar(id) {
    clearTimeout(this.#temporizadores.get(id));
    this.#temporizadores.delete(id);
    this.#lista?.querySelector(`[data-id="${id}"]`)?.remove();
  }

  /**
   * Cierra todas las notificaciones visibles de inmediato y libera todos los
   * temporizadores activos registrados en `#temporizadores`.
   */
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