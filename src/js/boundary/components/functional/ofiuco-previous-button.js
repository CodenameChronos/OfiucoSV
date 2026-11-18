/**
 * @fileoverview Web Component `<ofiuco-previous-button>` especializado en guardar los cambios
 * actuales y retroceder al paso anterior dentro del flujo de consulta médica (HU4).
 * Extiende `<ofiuco-button>` configurando sus propiedades visuales por defecto y el
 * evento personalizado que emite al hacer clic.
 */

import { defineOnce } from "../../core/define-once.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import { OfiucoButton } from "./ofiuco-button.js";

/**
 * Componente web `<ofiuco-previous-button>`.
 *
 * Botón especializado para guardar y retroceder al paso anterior de la consulta (HU4).
 * Al ser presionado, despacha el evento `ConsultaEventos.PASO_ANTERIOR`.
 *
 * @extends OfiucoButton
 * @fires CustomEvent#ConsultaEventos.PASO_ANTERIOR
 */
export class PreviousButton extends OfiucoButton {
  /** @type {string} Etiqueta visible por defecto del botón. */
  static defaultLabel = "Anterior";

  /** @type {string} Nombre del ícono por defecto mostrado junto a la etiqueta. */
  static defaultIcon = "prev";

  /** @type {string} Variante visual secundaria por defecto. */
  static defaultVariant = "secondary";

  /** @type {boolean} Indica que el botón muestra tanto su ícono como su etiqueta textual. */
  static defaultIconOnly = false;

  /** @type {string} Evento personalizado emitido al hacer clic en el botón. */
  static eventName = ConsultaEventos.PASO_ANTERIOR;
}

defineOnce("ofiuco-previous-button", PreviousButton);
export default PreviousButton;