class TarjetaSimple extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });

    // Creacion de div con seccion doble
    // (pensado principalmente para tarjeta de consulta
    // con un header conteniendo el id y la fecha de inicio
    // de la consulta)
    let topBar = document.createElement("div");
    topBar.setAttribute("class", "top-bar");
    topBar.appendChild(
      this.#crearSeccion("entityId", "entity-id", "Agregar ID de entidad"),
      this.#crearSeccion(
        "sideInfo",
        "side-info",
        "Agregar información lateral",
      ),
    );

    this.root.append(
      topBar,
      this.#crearSeccion("body", "body", "Agregar contenido"),
      this.#crearSeccion("footer", "footer", "Agregar pie de pagina"),
    );

    let estilo = document.createElement("link");
    estilo.setAttribute("rel", "stylesheet");
    estilo.setAttribute("href", "./resources/styles/tarjeta_simple.css");
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

// Valida que no exista un customElement con el mismo nombre
// que el que se intenta registrar
if (!customElements.get("ofiuco-tarjeta-simple")) {
  customElements.define("ofiuco-tarjeta-simple", TarjetaSimple);
}
export default TarjetaSimple;
