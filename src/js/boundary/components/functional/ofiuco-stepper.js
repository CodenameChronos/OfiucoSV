/**
 * @fileoverview Web Component presentacional `<ofiuco-stepper>` para el control de
 * navegación entre pasos de una consulta médica. Muestra el indicador de progreso
 * `"Paso N de M"` y los botones `<ofiuco-previous-button>` y `<ofiuco-next-button>`,
 * sincronizando su estado habilitado según el modelo recibido y el atributo `busy`.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import "../functional/ofiuco-previous-button.js";
import "../functional/ofiuco-next-button.js";

/** @type {string} URL resuelta de la hoja de estilos asociada al componente stepper. */
const stylesUrl = new URL(
  "../../../../resources/styles/components/stepper.css",
  import.meta.url,
).href;

/**
 * <ofiuco-stepper [busy]>
 *
 * Indicador "Paso N de M" con los botones Anterior y Guardar y avanzar.
 *
 * No calcula nada: recibe `model` (la propiedad `paso` de la vista del
 * AtencionService: { numero, total, puedeAvanzar, puedeRetroceder }) y habilita
 * o deshabilita los botones según sus banderas. Los clics salen como los
 * eventos de los botones (ConsultaEventos.PASO_ANTERIOR / PASO_SIGUIENTE).
 *
 * Atributo `busy`: deshabilita ambos botones mientras hay una operación en curso.
 * @extends BaseComponent
 * @fires CustomEvent#ConsultaEventos.PASO_ANTERIOR
 * @fires CustomEvent#ConsultaEventos.PASO_SIGUIENTE
 */
export class OfiucoStepper extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [stylesUrl];

  /**
   * Lista de atributos HTML observados para actualizar la vista reactivamente.
   * @type {string[]}
   */
  static observedAttributes = ["busy"];

  #model = null;
  #progreso;
  #anterior;
  #siguiente;

  get model() {
    return this.#model;
  }

  set model(valor) {
    this.#model = valor ?? null;
    if (this.rendered) this.#sincronizar();
  }

  /**
   * Construye la estructura DOM del stepper dentro del Shadow DOM (`<nav>`, texto de progreso
   * y contenedor de botones de acción) y ejecuta la sincronización inicial.
   */
  render() {
    this.#progreso = h("p", {
      class: "stepper__progreso",
      "aria-live": "polite",
    });
    this.#anterior = h("ofiuco-previous-button");
    this.#siguiente = h("ofiuco-next-button");

    this.shadowRoot.append(
      h(
        "nav",
        { class: "stepper", "aria-label": "Pasos de la consulta" },
        this.#progreso,
        h(
          "div",
          { class: "stepper__acciones" },
          this.#anterior,
          this.#siguiente,
        ),
      ),
    );
    this.#sincronizar();
  }

  /**
   * Callback nativo de Custom Elements ejecutado cuando cambia el atributo `busy`.
   * Actualiza el estado de habilitación de los botones si el componente ya fue renderizado.
   */
  attributeChangedCallback() {
    if (this.rendered) this.#sincronizar();
  }

  /**
   * Actualiza el texto de progreso (`"Paso N de M"`) y el estado `disabled` de los
   * botones anterior y siguiente en función de `#model` y el atributo booleano `busy`.
   */
  #sincronizar() {
    const m = this.#model;
    const ocupado = this.hasAttribute("busy");

    this.#progreso.textContent = m ? `Paso ${m.numero} de ${m.total}` : "";
    this.#anterior.disabled = ocupado || !m?.puedeRetroceder;
    this.#siguiente.disabled = ocupado || !m?.puedeAvanzar;
  }
}

defineOnce("ofiuco-stepper", OfiucoStepper);
export default OfiucoStepper;