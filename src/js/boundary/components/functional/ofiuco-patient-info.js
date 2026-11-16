import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import "../utils/ofiuco-avatar.js";
import "../primitives/simple_info.js";

const stylesUrl = new URL(
  "../../../../resources/styles/components/patient_info.css",
  import.meta.url,
).href;

/**
 * <ofiuco-patient-info>
 *
 * Generales del paciente: foto genérica, nombre, edad e ID.
 * Recibe `model` = `vista.paciente` ({ nombreCompleto, edad, idPersona }).
 * Reutilizable en la tarjeta de consulta del dashboard (HU3).
 */
export class OfiucoPatientInfo extends BaseComponent {
  static styleUrls = [stylesUrl];

  #model = null;
  #nombre;
  #edad;
  #id;

  get model() {
    return this.#model;
  }

  set model(valor) {
    this.#model = valor ?? null;
    if (this.rendered) this.#sincronizar();
  }

  render() {
    this.#nombre = h("p", { class: "nombre" });
    this.#edad = h("ofiuco-simple-info", { etiqueta: "Edad" });
    this.#id = h("ofiuco-simple-info", { etiqueta: "ID" });

    this.shadowRoot.append(
      h(
        "div",
        { class: "paciente" },
        h("ofiuco-avatar"),
        h("div", { class: "datos" }, this.#nombre, this.#edad, this.#id),
      ),
    );
    this.#sincronizar();
  }

  #sincronizar() {
    const paciente = this.#model;
    this.#nombre.textContent = paciente?.nombreCompleto ?? "";
    this.#edad.setAttribute("valor", textoEdad(paciente?.edad));
    this.#id.setAttribute("valor", paciente?.idPersona ?? "");
  }
}

/** "20 años", "1 año" o "No registrada". */
function textoEdad(edad) {
  if (edad == null || Number.isNaN(Number(edad))) return "No registrada";
  return `${edad} ${Number(edad) === 1 ? "año" : "años"}`;
}

defineOnce("ofiuco-patient-info", OfiucoPatientInfo);
export default OfiucoPatientInfo;
