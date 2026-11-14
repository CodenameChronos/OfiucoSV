import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { SessionEvents, isValidSession } from "../../core/session-events.js";
import "../utils/ofiuco-icon.js";
import "../utils/ofiuco-clock.js";
import "../utils/ofiuco-session-chip.js";
import "../functional/ofiuco-login-button.js";

const DEFAULT_APP_NAME = "OfiucoSV";

/**
 * <ofiuco-header [app-name="OfiucoSV"] [hide-session]>
 *
 * Encabezado de la aplicación: logo + nombre | reloj | chip de sesión + botón.
 *
 * Estado de sesión (solo lectura desde fuera, salvo restauración):
 *  - Escucha en `document` los eventos SessionEvents.LOGIN y LOGOUT.
 *  - Para restaurar una sesión previa (p. ej. al recargar la página, antes de
 *    que existan eventos) se puede asignar la propiedad `session`.
 *
 * Atributos:
 *  - app-name:     nombre mostrado junto al logo.
 *  - hide-session: oculta chip y botón (pantallas que no los necesitan).
 *
 * Sin sesión el chip queda oculto (caso HU1) y el botón ofrece "Iniciar sesión".
 */
export class OfiucoHeader extends BaseComponent {
  static observedAttributes = ["app-name"];

  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/header.css",
      import.meta.url,
    ).href,
  ];

  /** @type {import('../../core/session-events.js').Session|null} */
  #session = null;
  #appNameEl;
  #chip;
  #button;

  #onLogin = (event) => {
    if (isValidSession(event.detail)) this.session = event.detail;
  };

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

  onConnect() {
    document.addEventListener(SessionEvents.LOGIN, this.#onLogin);
    document.addEventListener(SessionEvents.LOGOUT, this.#onLogout);
  }

  onDisconnect() {
    document.removeEventListener(SessionEvents.LOGIN, this.#onLogin);
    document.removeEventListener(SessionEvents.LOGOUT, this.#onLogout);
  }

  attributeChangedCallback() {
    if (this.rendered) this.#paintAppName();
  }

  #paintAppName() {
    this.#appNameEl.textContent =
      this.getAttribute("app-name") || DEFAULT_APP_NAME;
  }

  #paintSession() {
    this.#chip.session = this.#session;
    this.#button.loggedIn = this.#session !== null;
  }
}

defineOnce("ofiuco-header", OfiucoHeader);

export default OfiucoHeader;
