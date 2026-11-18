import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

let eventoDiferido = null;
const INSTALABLE = "ofiuco:instalable";

window.addEventListener("beforeinstallprompt", (evento) => {
  evento.preventDefault();
  eventoDiferido = evento;
  window.dispatchEvent(new Event(INSTALABLE));
});

window.addEventListener("appinstalled", () => {
  eventoDiferido = null;
  window.dispatchEvent(new Event(INSTALABLE));
});

const yaInstalada = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

/**
 * Componente web `<ofiuco-install-button>` para la instalación de la PWA.
 * @extends BaseComponent
 */
export class OfiucoInstallButton extends BaseComponent {
  /**
   * Hojas de estilo cargadas automáticamente en el Shadow DOM por BaseComponent.
   * @type {string[]}
   */
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/install_button.css",
      import.meta.url,
    ).href,
  ];

  #boton;

  #sincronizar = () => {
    this.hidden = !eventoDiferido || yaInstalada();
  };

  /**
   * Construye el contenido del Shadow DOM utilizando la utilidad `h()`.
   */
  render() {
    this.#boton = h("button", { type: "button" }, "Instalar aplicación");
    this.#boton.addEventListener("click", () => this.#instalar());
    this.shadowRoot.append(this.#boton);
  }

  /**
   * Ciclo de vida al conectar al DOM: suscribe eventos de sincronización.
   */
  onConnect() {
    window.addEventListener(INSTALABLE, this.#sincronizar);
    this.#sincronizar();
  }

  /**
   * Ciclo de vida al desconectar del DOM: limpia los event listeners.
   */
  onDisconnect() {
    window.removeEventListener(INSTALABLE, this.#sincronizar);
  }

  async #instalar() {
    if (!eventoDiferido) return;
    const evento = eventoDiferido;
    eventoDiferido = null;
    await evento.prompt();
    await evento.userChoice;
    this.#sincronizar();
  }
}

defineOnce("ofiuco-install-button", OfiucoInstallButton);
export default OfiucoInstallButton;
