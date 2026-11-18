/**
 * @fileoverview Web Component `<ofiuco-login-button>` de solo ícono para solicitar
 * el inicio o cierre de sesión. No gestiona autenticación directamente: refleja
 * el estado externo mediante el atributo booleano `logged-in` y despacha los eventos
 * de sesión `SessionEvents.LOGIN_REQUESTED` o `SessionEvents.LOGOUT_REQUESTED`.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import { SessionEvents } from "../../core/session-events.js";
import "../utils/ofiuco-icon.js";

/**
 * <ofiuco-login-button [logged-in]>
 *
 * Botón de solo ícono que alterna entre "Iniciar sesión" y "Cerrar sesión"
 * según el atributo booleano `logged-in` (propiedad `loggedIn`).
 *
 * No autentica: al hacer clic emite una *solicitud* (LOGIN_REQUESTED o
 * LOGOUT_REQUESTED) y la shell decide. El estado lo recibe desde fuera
 * (el Header lo sincroniza con los eventos de sesión).
 * @extends BaseComponent
 * @fires CustomEvent#SessionEvents.LOGIN_REQUESTED
 * @fires CustomEvent#SessionEvents.LOGOUT_REQUESTED
 */
export class OfiucoLoginButton extends BaseComponent {
  /**
   * Lista de atributos HTML observados para actualizar la vista reactivamente.
   * @type {string[]}
   */
  static observedAttributes = ["logged-in"];

  /**
   * Hojas de estilo asociadas al Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/login_button.css",
      import.meta.url,
    ).href,
  ];

  #button;
  #icon;

  get loggedIn() {
    return this.hasAttribute("logged-in");
  }

  set loggedIn(value) {
    this.toggleAttribute("logged-in", Boolean(value));
  }

  /**
   * Construye la estructura DOM del botón dentro del Shadow DOM (`<button>` y `<ofiuco-icon>`),
   * enlaza el listener de clic y pinta el estado inicial.
   */
  render() {
    this.#icon = h("ofiuco-icon");
    this.#button = h("button", { type: "button", part: "button" }, this.#icon);
    this.#button.addEventListener("click", () => this.#requestChange());
    this.shadowRoot.append(this.#button);
    this.#paint();
  }

  /**
   * Callback nativo de Custom Elements ejecutado cuando cambia el atributo `logged-in`.
   * Actualiza el ícono y las etiquetas accesibles si el componente ya está renderizado.
   */
  attributeChangedCallback() {
    if (this.rendered) this.#paint();
  }

  /**
   * Sincroniza el ícono (`"logout"` o `"login"`), el atributo `aria-label` y el `title`
   * del botón interno de acuerdo con el valor actual de `loggedIn`.
   */
  #paint() {
    const label = this.loggedIn ? "Cerrar sesión" : "Iniciar sesión";
    this.#icon.setAttribute("name", this.loggedIn ? "logout" : "login");
    this.#button.setAttribute("aria-label", label);
    this.#button.title = label;
  }

  /**
   * Despacha el evento de solicitud correspondiente (`SessionEvents.LOGOUT_REQUESTED` si
   * `loggedIn` es verdadero, o `SessionEvents.LOGIN_REQUESTED` en caso contrario) con
   * burbujeo y cruce del Shadow DOM.
   */
  #requestChange() {
    const name = this.loggedIn
      ? SessionEvents.LOGOUT_REQUESTED
      : SessionEvents.LOGIN_REQUESTED;
    this.dispatchEvent(
      new CustomEvent(name, { bubbles: true, composed: true }),
    );
  }
}

defineOnce("ofiuco-login-button", OfiucoLoginButton);

export default OfiucoLoginButton;