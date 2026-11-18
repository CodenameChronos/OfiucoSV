/**
 * @fileoverview Web Component `<ofiuco-remove-exam-button>` especializado en quitar
 * un examen médico previamente asignado dentro del flujo de consulta (HU4).
 * Extiende `<ofiuco-button>` configurándose como un botón de solo ícono (`close`)
 * que transporta el identificador del examen en su atributo `value`.
 */

import { defineOnce } from "../../core/define-once.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import { OfiucoButton } from "./ofiuco-button.js";

/**
 * Componente web `<ofiuco-remove-exam-button>`.
 *
 * Botón especializado para quitar un examen asignado en la consulta (HU4).
 * El identificador del examen viaja en el atributo `value` y se incluye en
 * `detail.value` al despachar el evento `ConsultaEventos.QUITAR_EXAMEN`.
 *
 * @extends OfiucoButton
 * @fires CustomEvent#ConsultaEventos.QUITAR_EXAMEN
 */
export class RemoveExamButton extends OfiucoButton {
  /** @type {string} Etiqueta accesible por defecto (`aria-label` y `title`). */
  static defaultLabel = "Quitar examen";

  /** @type {string} Nombre del ícono por defecto (`close`). */
  static defaultIcon = "close";

  /** @type {string} Variante visual secundaria por defecto. */
  static defaultVariant = "secondary";

  /** @type {boolean} Configura el botón en modo solo ícono por defecto. */
  static defaultIconOnly = true;

  /** @type {string} Evento personalizado emitido al hacer clic en el botón. */
  static eventName = ConsultaEventos.QUITAR_EXAMEN;
}

defineOnce("ofiuco-remove-exam-button", RemoveExamButton);
export default RemoveExamButton;