import { defineOnce } from "../../core/define-once.js";

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

export class OfiucoInstallButton extends HTMLElement {
  #boton;
  #sincronizar = () => {
    this.hidden = !eventoDiferido || yaInstalada();
  };

  connectedCallback() {
    if (!this.#boton) {
      this.attachShadow({ mode: "open" });
      this.#boton = document.createElement("button");
      this.#boton.type = "button";
      this.#boton.textContent = "Instalar aplicación";
      this.#boton.addEventListener("click", () => this.#instalar());
      this.shadowRoot.append(this.#boton);
    }
    window.addEventListener(INSTALABLE, this.#sincronizar);
    this.#sincronizar();
  }

  disconnectedCallback() {
    window.removeEventListener(INSTALABLE, this.#sincronizar);
  }

  async #instalar() {
    if (!eventoDiferido) return;
    const evento = eventoDiferido;
    eventoDiferido = null; // el evento solo se puede usar una vez
    await evento.prompt();
    await evento.userChoice;
    this.#sincronizar();
  }
}

defineOnce("ofiuco-install-button", OfiucoInstallButton);
export default OfiucoInstallButton;
