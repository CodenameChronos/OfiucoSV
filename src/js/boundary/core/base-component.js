/**
 * @file Clase base de los Web Components de la aplicación.
 *
 * Centraliza lo repetitivo: shadow root abierto, carga de las hojas de estilo
 * propias (archivos .css en resources/styles, mediante <link> dentro del
 * shadow root) y un ciclo de vida simple: render() se ejecuta una vez, y
 * onConnect()/onDisconnect() en cada conexión/desconexión al DOM.
 *
 * Mientras las hojas cargan, el componente permanece oculto (visibility) para
 * evitar el destello de contenido sin estilos; la promesa `ready` indica
 * cuándo ya está estilizado (carga correcta o fallida).
 */
export class BaseComponent extends HTMLElement {
  /**
   * URLs absolutas de las hojas de estilo del componente. Se construyen con
   * `new URL("ruta/relativa.css", import.meta.url).href` para que no dependan
   * de la ruta actual del navegador (importante en una SPA con rutas anidadas).
   * Una subclase que hereda de otra puede extender: [...Padre.styleUrls, propia].
   * @type {string[]}
   */
  static styleUrls = [];

  #rendered = false;
  #ready;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.#ready = this.#loadStyles();
  }

  /** Se resuelve cuando las hojas de estilo terminaron de cargar (o fallaron). */
  get ready() {
    return this.#ready;
  }

  /** `true` una vez que render() terminó (útil en attributeChangedCallback). */
  get rendered() {
    return this.#rendered;
  }

  connectedCallback() {
    if (!this.#rendered) {
      this.render();
      this.#rendered = true;
    }
    this.onConnect();
  }

  disconnectedCallback() {
    this.onDisconnect();
  }

  /** Construye el DOM interno. Se ejecuta una sola vez. */
  render() {}

  /** Se ejecuta cada vez que el componente entra al DOM. */
  onConnect() {}

  /** Se ejecuta cada vez que el componente sale del DOM (liberar recursos). */
  onDisconnect() {}

  #loadStyles() {
    const urls = this.constructor.styleUrls;
    if (urls.length === 0) return Promise.resolve();

    const guard = document.createElement("style");
    guard.textContent = ":host { visibility: hidden; }";
    this.shadowRoot.append(guard);

    const loads = urls.map(
      (url) =>
        new Promise((resolve) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = url;
          link.addEventListener("load", resolve, { once: true });
          link.addEventListener("error", resolve, { once: true });
          this.shadowRoot.append(link);
        }),
    );

    return Promise.all(loads).then(() => guard.remove());
  }
}
