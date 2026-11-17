/**
 * @fileoverview Web Component base `<ofiuco-tarjeta-simple>` que define una estructura
 * genérica de tarjeta con Shadow DOM abierto y cuatro ranuras nombradas (`entity-id`,
 * `side-info`, `body` y `footer`) para componer tarjetas especializadas mediante herencia
 * o proyección desde el Light DOM.
 */

/**
 * Componente web base `<ofiuco-tarjeta-simple>`.
 *
 * Construye un contenedor estructurado en tres áreas dentro de su `ShadowRoot` (`this.root`):
 * - `.top-bar`: Encabezado dividido en dos secciones (`entity-id` y `side-info`).
 * - `.body`: Cuerpo principal (`slot="body"`).
 * - `.footer`: Pie de tarjeta (`slot="footer"`).
 *
 * Incluye la hoja de estilos `./resources/styles/tarjeta_simple.css` y sirve como
 * clase padre para componentes como `TarjetaConsulta`.
 *
 * @extends HTMLElement
 */
class TarjetaSimple extends HTMLElement {
  /**
   * Inicializa el `ShadowRoot` abierto (`this.root`), construye las secciones
   * con sus respectivos `<slot>` nombrados y adjunta la hoja de estilos base.
   */
  constructor() {
    super();
    /** @type {ShadowRoot} Raíz Shadow DOM abierta del componente. */
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
   * Crea un `<div class="...">` que contiene un `<slot name="...">`.
   * Generalizado como un método privado para no repetir la lógica n veces.
   *
   * @param {string} clase - Clase CSS aplicada al contenedor `<div>` de la sección.
   * @param {string} nombreSlot - Nombre del atributo `name` asignado al elemento `<slot>`.
   * @param {string} textoPorDefecto - Texto de respaldo mostrado cuando el slot no recibe contenido proyectado.
   * @returns {HTMLDivElement} Contenedor `<div>` con su `<slot>` interno.
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