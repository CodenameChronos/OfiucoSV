/**
 * @fileoverview Clase base de los Web Components de la aplicación.
 *
 * Centraliza lo repetitivo: shadow root abierto, carga de las hojas de estilo
 * propias (archivos .css en resources/styles, mediante <link> dentro del
 * shadow root) y un ciclo de vida simple: render() se ejecuta una vez, y
 * onConnect()/onDisconnect() en cada conexión/desconexión al DOM.
 *
 * Mientras las hojas cargan, el componente permanece oculto (visibility) para
 * evitar el destello de contenido sin estilos; la promesa `ready` indica
 * cuándo ya está estilizado (carga correcta o fallida).
 * @extends HTMLElement
 */
export class BaseComponent extends HTMLElement {
  /**
   * URLs absolutas de las hojas de estilo del componente. Se construyen con
   * `new URL("ruta/relativa.css", import.meta.url).href` para que no dependan
   * de la ruta actual del navegador (importante en una SPA con rutas anidadas).
   * Una subclase que hereda de otra puede extender: `[...Padre.styleUrls, propia]`.
   * @type {string[]}
   */
  static styleUrls = [];

  #rendered = false;
  #ready;

  /**
   * Inicializa el Shadow DOM abierto del componente y dispara la precarga
   * asíncrona de las hojas de estilo definidas en `static styleUrls`.
   */
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.#ready = this.#loadStyles();
  }

  get ready() {
    return this.#ready;
  }

  get rendered() {
    return this.#rendered;
  }

  /**
   * Callback nativo de Custom Elements invocado cuando el elemento se inserta en el DOM.
   * Garantiza que `render()` se ejecute una única vez antes de invocar `onConnect()`.
   */
  connectedCallback() {
    if (!this.#rendered) {
      this.render();
      this.#rendered = true;
    }
    this.onConnect();
  }

  /**
   * Callback nativo de Custom Elements invocado cuando el elemento se retira del DOM.
   * Delega la limpieza de recursos en `onDisconnect()`.
   */
  disconnectedCallback() {
    this.onDisconnect();
  }

  /** Construye el DOM interno. Se ejecuta una sola vez. */
  render() {}

  /** Se ejecuta cada vez que el componente entra al DOM. */
  onConnect() {}

  /** Se ejecuta cada vez que el componente sale del DOM (liberar recursos). */
  onDisconnect() {}

  /**
   * Inyecta etiquetas `<link rel="stylesheet">` en `this.shadowRoot` para cada URL
   * en `this.constructor.styleUrls`, ocultando temporalmente `:host` mediante un
   * estilo de guarda hasta que todas las hojas disparen `load` o `error`.
   *
   * @returns {Promise<void>} Promesa que se resuelve al completarse todas las cargas.
   */
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