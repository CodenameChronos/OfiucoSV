import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

const MINUTE_MS = 60_000;
const pad = (n) => String(n).padStart(2, "0");

/** @param {Date} date @returns {string} dd/MM/yyyy (hora local) */
export function formatDate(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** @param {Date} date @returns {string} hh:mm AM|PM, formato de 12 horas */
export function formatTime(date) {
  const hours = date.getHours();
  return `${pad(hours % 12 || 12)}:${pad(date.getMinutes())} ${hours < 12 ? "AM" : "PM"}`;
}

/**
 * <ofiuco-clock>
 *
 * Muestra fecha y hora del dispositivo y se actualiza al inicio de cada
 * minuto (un solo temporizador por instancia, liberado al desconectarse).
 *
 * Partes CSS expuestas: `fecha` y `hora` (ej. ofiuco-clock::part(fecha)).
 */
export class OfiucoClock extends BaseComponent {
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/clock.css",
      import.meta.url,
    ).href,
  ];

  #dateEl;
  #timeEl;
  #timer = null;

  render() {
    this.#dateEl = h("time", { class: "fecha", part: "fecha" });
    this.#timeEl = h("time", { class: "hora", part: "hora" });
    this.shadowRoot.append(this.#dateEl, this.#timeEl);
  }

  onConnect() {
    this.#refresh();
    this.#scheduleNext();
  }

  onDisconnect() {
    clearTimeout(this.#timer);
    this.#timer = null;
  }

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

  /** Programa la próxima actualización justo al cambiar el minuto. */
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
