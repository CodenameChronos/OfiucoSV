/**
 * @fileoverview Web Component `<ofiuco-save-button>` especializado en guardar los cambios
 * del paso actual dentro del flujo de consulta médica sin avanzar al siguiente paso (HU4).
 * Extiende `<ofiuco-button>` configurando sus propiedades visuales por defecto y el
 * evento personalizado que emite al hacer clic.
 */

import { defineOnce } from "../../core/define-once.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import { OfiucoButton } from "./ofiuco-button.js";

/**
 * Componente web `<ofiuco-save-button>`.
 *
 * Botón especializado para guardar los cambios del paso actual de la consulta sin avanzar (HU4).
 * Al ser presionado, despacha el evento `ConsultaEventos.GUARDAR`.
 *
 * @extends OfiucoButton
 * @fires CustomEvent#ConsultaEventos.GUARDAR
 */
export class SaveButton extends OfiucoButton {
  /** @type {string} Etiqueta visible por defecto del botón. */
  static defaultLabel = "Guardar cambios";

  /** @type {string|null} Nombre del ícono por defecto (sin ícono). */
  static defaultIcon = null;

  /** @type {string} Variante visual secundaria por defecto. */
  static defaultVariant = "secondary";

  /** @type {boolean} Indica que el botón muestra su etiqueta textual. */
  static defaultIconOnly = false;

  /** @type {string} Evento personalizado emitido al hacer clic en el botón. */
  static eventName = ConsultaEventos.GUARDAR;
}

defineOnce("ofiuco-save-button", SaveButton);
export default SaveButton;