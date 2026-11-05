class Layout extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });

    // Utilizando constructor para inicializar elementos en shadow root
    // en lugar de connectedCallback, para evitar que se dupliquen al reconectar el elemento
    const contenido = document.createElement("div");
    contenido.setAttribute("class", "contenido");
    contenido.append(
      // Sidebar y header en un mismo div para poder asociarles
      // position: sticky a la vez en vista movil sin que uno quede
      // por encima del otro
      this.#crearSeccion("sidebar", "side-bar", "Agregar barra lateral"),
      this.#crearSeccion(
        "workspace",
        "workspace",
        "Agregar espacio de trabajo",
      ),
    );

    this.root.append(
      this.#crearSeccion("header", "top-bar", "Agregar barra superior"),
      contenido,
      this.#crearSeccion("footer", "footer", "Agregar pie de pagina"),
    );

    const estilo = document.createElement("link");
    estilo.setAttribute("rel", "stylesheet");
    estilo.setAttribute("href", "./resources/styles/layout.css");
    this.root.appendChild(estilo);
  }

  /**
   * Crea un <div class="..."> que contiene un <slot name="...">.
   * Generalizado como un metodo "padre" y no repetir la logica n veces
   * @param {string} clase         clase CSS de la sección
   * @param {string} nombreSlot    nombre del slot
   * @param {string} textoPorDefecto contenido de respaldo del slot
   * @returns {HTMLDivElement}
   */
  #crearSeccion(clase, nombreSlot, textoPorDefecto) {
    const seccion = document.createElement("div");
    seccion.setAttribute("class", clase);

    const slot = document.createElement("slot");
    slot.setAttribute("name", nombreSlot);
    slot.textContent = textoPorDefecto;

    seccion.appendChild(slot);
    return seccion;
  }
}

if (!customElements.get("ofiuco-layout")) {
  customElements.define("ofiuco-layout", Layout);
}
export default Layout;
