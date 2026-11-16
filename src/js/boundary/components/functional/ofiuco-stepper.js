import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import "../functional/ofiuco-previous-button.js";
import "../functional/ofiuco-next-button.js";

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
 */
export class OfiucoStepper extends BaseComponent {
  static styleUrls = [stylesUrl];
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

  attributeChangedCallback() {
    if (this.rendered) this.#sincronizar();
  }

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
