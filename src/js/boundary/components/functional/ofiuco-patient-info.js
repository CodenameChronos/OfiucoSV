/**
 * @fileoverview Web Component presentacional `<ofiuco-patient-info>` para mostrar
 * la información resumida de un paciente (avatar, nombre completo, edad formateada
 * e identificador de persona) a partir de su propiedad `model`.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import "../utils/ofiuco-avatar.js";
import "../primitives/simple_info.js";

/** @type {string} URL resuelta de la hoja de estilos asociada a la tarjeta de información del paciente. */
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
 * @extends BaseComponent
 */
export class OfiucoPatientInfo extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
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

  /**
   * Construye la estructura DOM del componente dentro del Shadow DOM (`<ofiuco-avatar>`,
   * nombre y campos de información simple) y ejecuta la sincronización inicial.
   */
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

  /**
   * Actualiza los elementos internos del Shadow DOM con los valores provenientes de `#model`.
   */
  #sincronizar() {
    const paciente = this.#model;
    this.#nombre.textContent = paciente?.nombreCompleto ?? "";
    this.#edad.setAttribute("valor", textoEdad(paciente?.edad));
    this.#id.setAttribute("valor", paciente?.idPersona ?? "");
  }
}

/**
 * Formatea una edad numérica en texto legible en español (`"20 años"`, `"1 año"`)
 * o devuelve `"No registrada"` si el valor es nulo, indefinido o no numérico.
 *
 * @param {number|string|null|undefined} edad - Edad del paciente.
 * @returns {string} Edad formateada o `"No registrada"`.
 */
function textoEdad(edad) {
  if (edad == null || Number.isNaN(Number(edad))) return "No registrada";
  return `${edad} ${Number(edad) === 1 ? "año" : "años"}`;
}

defineOnce("ofiuco-patient-info", OfiucoPatientInfo);
export default OfiucoPatientInfo;