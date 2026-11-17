/**
 * @fileoverview Web Component `<ofiuco-clock>` que muestra la fecha y hora local
 * del dispositivo mediante elementos semánticos `<time>` con atributos `datetime`
 * conformes a HTML. Sincroniza sus actualizaciones exactamente al cambio de cada
 * minuto y libera su temporizador al desconectarse del DOM.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

/** @type {number} Duración de un minuto expresada en milisegundos. */
const MINUTE_MS = 60_000;

/**
 * Rellena con un cero a la izquierda valores numéricos menores a 10 para mantener
 * un formato fijo de dos dígitos.
 *
 * @param {number} n - Número entero a formatear.
 * @returns {string} Cadena de dos dígitos (por ejemplo, `"05"`).
 */
const pad = (n) => String(n).padStart(2, "0");

/**
 * Formatea una fecha en representación local `dd/MM/yyyy`.
 *
 * @param {Date} date - Instancia de fecha a formatear.
 * @returns {string} Cadena con formato `dd/MM/yyyy` en hora local.
 */
export function formatDate(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Formatea la hora de una fecha en formato de 12 horas (`hh:mm AM|PM`).
 *
 * @param {Date} date - Instancia de fecha de la cual extraer la hora.
 * @returns {string} Cadena con formato `hh:mm AM` o `hh:mm PM`.
 */
export function formatTime(date) {
  const hours = date.getHours();
  return `${pad(hours % 12 || 12)}:${pad(date.getMinutes())} ${hours < 12 ? "AM" : "PM"}`;
}

/**
 * Componente web `<ofiuco-clock>`.
 *
 * Muestra fecha y hora del dispositivo y se actualiza al inicio de cada
 * minuto (un solo temporizador por instancia, liberado al desconectarse).
 *
 * Partes CSS expuestas: `fecha` y `hora` (ej. `ofiuco-clock::part(fecha)`).
 *
 * @extends BaseComponent
 */
export class OfiucoClock extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/clock.css",
      import.meta.url,
    ).href,
  ];

  #dateEl;
  #timeEl;
  #timer = null;

  /**
   * Construye los elementos `<time>` de fecha y hora dentro del Shadow DOM,
   * exponiendo las partes CSS `fecha` y `hora`.
   */
  render() {
    this.#dateEl = h("time", { class: "fecha", part: "fecha" });
    this.#timeEl = h("time", { class: "hora", part: "hora" });
    this.shadowRoot.append(this.#dateEl, this.#timeEl);
  }

  /**
   * Ciclo de vida ejecutado al conectar el componente al DOM.
   * Realiza una actualización inmediata de fecha y hora y programa el ciclo por minuto.
   */
  onConnect() {
    this.#refresh();
    this.#scheduleNext();
  }

  /**
   * Ciclo de vida ejecutado al desconectar el componente del DOM.
   * Cancela el temporizador activo para evitar fugas de memoria.
   */
  onDisconnect() {
    clearTimeout(this.#timer);
    this.#timer = null;
  }

  /**
   * Obtiene la fecha y hora actual del sistema y actualiza tanto el texto visible
   * como los atributos `datetime` (`YYYY-MM-DD` y `HH:mm`) de `#dateEl` y `#timeEl`.
   */
  #refresh() {
    const now = new Date();
    this.#dateEl.textContent = formatDate(now);
    this.#dateEl.setAttribute(
      "datetime",
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    );
    this.#timeEl.textContent = formatTime(now);
    this.#timeEl.setAttribute(
      "datetime",
      `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    );
  }

  /**
   * Programa la próxima actualización exactamente al inicio del siguiente minuto
   * calculando los milisegundos restantes (`MINUTE_MS - (Date.now() % MINUTE_MS)`).
   */
  #scheduleNext() {
    clearTimeout(this.#timer);
    this.#timer = setTimeout(
      () => {
        this.#refresh();
        this.#scheduleNext();
      },
      MINUTE_MS - (Date.now() % MINUTE_MS),
    );
  }
}

defineOnce("ofiuco-clock", OfiucoClock);

export default OfiucoClock;