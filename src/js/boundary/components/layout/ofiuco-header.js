/**
 * @fileoverview Web Component `<ofiuco-header>`: encabezado principal de la aplicación.
 * Integra la identidad visual (ícono de logo y nombre de aplicación configurable),
 * el reloj en tiempo real (`<ofiuco-clock>`), el indicador de usuario autenticado
 * (`<ofiuco-session-chip>`) y el botón de acceso (`<ofiuco-login-button>`),
 * reaccionando automáticamente a los eventos globales `SessionEvents.LOGIN` y `LOGOUT`.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { SessionEvents, isValidSession } from "../../core/session-events.js";
import "../utils/ofiuco-icon.js";
import "../utils/ofiuco-clock.js";
import "../utils/ofiuco-session-chip.js";
import "../functional/ofiuco-login-button.js";

/** @type {string} Nombre por defecto mostrado en el encabezado si no se especifica el atributo `app-name`. */
const DEFAULT_APP_NAME = "OfiucoSV";

/**
 * Componente web `<ofiuco-header [app-name="OfiucoSV"] [hide-session]>`.
 *
 * Encabezado de la aplicación: logo + nombre | reloj | chip de sesión + botón.
 *
 * Estado de sesión (solo lectura desde fuera, salvo restauración):
 * - Escucha en `document` los eventos `SessionEvents.LOGIN` y `LOGOUT`.
 * - Para restaurar una sesión previa (p. ej. al recargar la página, antes de
 *   que existan eventos) se puede asignar la propiedad `session`.
 *
 * Atributos:
 * - `app-name`: nombre mostrado junto al logo.
 * - `hide-session`: oculta chip y botón (pantallas que no los necesitan).
 *
 * Sin sesión el chip queda oculto (caso HU1) y el botón ofrece `"Iniciar sesión"`.
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
   * Construye la estructura DOM del encabezado dentro del Shadow DOM (`<header>`,
   * bloque de marca con logo y título, bloque del reloj y bloque de sesión con chip y botón)
   * y sincroniza el estado inicial.
   */
  render() {
    this.#appNameEl = h("span", { class: "nombre-app" });
    this.#chip = h("ofiuco-session-chip");
    this.#button = h("ofiuco-login-button");

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
        h("div", { class: "sesion" }, this.#chip, this.#button),
      ),
    );

    this.#paintAppName();
    this.#paintSession();
  }

  /**
   * Ciclo de vida ejecutado al conectar el elemento al DOM.
   * Suscribe los listeners globales `SessionEvents.LOGIN` y `SessionEvents.LOGOUT` en `document`.
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
   * Actualiza el nombre mostrado si el componente ya fue renderizado.
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