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
 */
export class OfiucoLoginButton extends BaseComponent {
  static observedAttributes = ["logged-in"];

  static styleUrls = [
    new URL(
      "../../../resources/styles/components/login_button.css",
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

  render() {
    this.#icon = h("ofiuco-icon");
    this.#button = h("button", { type: "button", part: "button" }, this.#icon);
    this.#button.addEventListener("click", () => this.#requestChange());
    this.shadowRoot.append(this.#button);
    this.#paint();
  }

  attributeChangedCallback() {
    if (this.rendered) this.#paint();
  }

  #paint() {
    const label = this.loggedIn ? "Cerrar sesión" : "Iniciar sesión";
    this.#icon.setAttribute("name", this.loggedIn ? "logout" : "login");
    this.#button.setAttribute("aria-label", label);
    this.#button.title = label;
  }

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
