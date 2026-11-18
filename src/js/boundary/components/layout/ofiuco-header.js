/**
 * @fileoverview Web Component `<ofiuco-header>`: encabezado principal de la aplicación.
 * Integra la identidad visual, reloj, chip de sesión, botón de login
 * y el botón de instalación de la aplicación (`<ofiuco-install-button>`).
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { SessionEvents, isValidSession } from "../../core/session-events.js";
import "../utils/ofiuco-icon.js";
import "../utils/ofiuco-clock.js";
import "../utils/ofiuco-session-chip.js";
import "../functional/ofiuco-login-button.js";
import "../utils/ofiuco-install-button.js";

/** @type {string} Nombre por defecto mostrado en el encabezado si no se especifica el atributo `app-name`. */
const DEFAULT_APP_NAME = "OfiucoSV";

/**
 * Componente web `<ofiuco-header [app-name="OfiucoSV"] [hide-session]>`.
 *
 * Encabezado de la aplicación: logo + nombre | reloj | botón de instalación, chip y botón de sesión.
 *
 * @extends BaseComponent
 */
export class OfiucoHeader extends BaseComponent {
  /**
   * Lista de atributos HTML observados para actualizar el nombre de la aplicación.
   * @type {string[]}
   */
  static observedAttributes = ["app-name"];

  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/header.css",
      import.meta.url,
    ).href,
  ];

  #session = null;
  #appNameEl;
  #chip;
  #button;
  #installBtn;

  /**
   * Manejador para el evento `SessionEvents.LOGIN` en `document`.
   * Valida la carga útil (`event.detail`) y actualiza la sesión activa del encabezado.
   *
   * @param {CustomEvent<import('../../core/session-events.js').Session>} event - Evento de inicio de sesión.
   */
  #onLogin = (event) => {
    if (isValidSession(event.detail)) this.session = event.detail;
  };

  /**
   * Manejador para el evento `SessionEvents.LOGOUT` en `document`.
   * Limpia la sesión activa del encabezado asignando `null`.
   */
  #onLogout = () => {
    this.session = null;
  };

  get session() {
    return this.#session;
  }

  set session(value) {
    this.#session = isValidSession(value) ? value : null;
    if (this.rendered) this.#paintSession();
  }

  /**
   * Construye la estructura DOM del encabezado dentro del Shadow DOM,
   * incluyendo el componente `<ofiuco-install-button>` dentro de la sección de sesión.
   */
  render() {
    this.#appNameEl = h("span", { class: "nombre-app" });
    this.#chip = h("ofiuco-session-chip");
    this.#button = h("ofiuco-login-button");
    this.#installBtn = h("ofiuco-install-button");

    this.shadowRoot.append(
      h(
        "header",
        {},
        h(
          "div",
          { class: "marca" },
          h("ofiuco-icon", { name: "logo" }),
          this.#appNameEl,
        ),
        h("div", { class: "reloj" }, h("ofiuco-clock")),
        h(
          "div",
          { class: "sesion" },
          this.#installBtn,
          this.#chip,
          this.#button,
        ),
      ),
    );

    this.#paintAppName();
    this.#paintSession();
  }

  /**
   * Ciclo de vida ejecutado al conectar el elemento al DOM.
   * Suscribe los listeners globales de sesión en `document`.
   */
  onConnect() {
    document.addEventListener(SessionEvents.LOGIN, this.#onLogin);
    document.addEventListener(SessionEvents.LOGOUT, this.#onLogout);
  }

  /**
   * Ciclo de vida ejecutado al desconectar el elemento del DOM.
   * Elimina los listeners globales de sesión en `document` para evitar fugas de memoria.
   */
  onDisconnect() {
    document.removeEventListener(SessionEvents.LOGIN, this.#onLogin);
    document.removeEventListener(SessionEvents.LOGOUT, this.#onLogout);
  }

  /**
   * Callback nativo de Custom Elements ejecutado cuando cambia el atributo `app-name`.
   */
  attributeChangedCallback() {
    if (this.rendered) this.#paintAppName();
  }

  /**
   * Actualiza el texto de `#appNameEl` tomando el valor del atributo `app-name`
   * o `DEFAULT_APP_NAME` si el atributo está ausente o vacío.
   */
  #paintAppName() {
    this.#appNameEl.textContent =
      this.getAttribute("app-name") || DEFAULT_APP_NAME;
  }

  /**
   * Propaga el estado actual de `#session` hacia el chip de sesión y el botón de login.
   */
  #paintSession() {
    this.#chip.session = this.#session;
    this.#button.loggedIn = this.#session !== null;
  }
}

defineOnce("ofiuco-header", OfiucoHeader);

export default OfiucoHeader;
