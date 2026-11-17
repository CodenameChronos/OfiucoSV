/**
 * @fileoverview Web Component `<ofiuco-next-button>` especializado en guardar los cambios
 * actuales y avanzar al siguiente paso dentro del flujo de consulta médica (HU4).
 * Extiende `<ofiuco-button>` configurando sus propiedades visuales por defecto y el
 * evento personalizado que emite al hacer clic.
 */

import { defineOnce } from "../../core/define-once.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import { OfiucoButton } from "./ofiuco-button.js";

/**
 * Componente web `<ofiuco-next-button>`.
 *
 * Botón especializado para guardar y avanzar al siguiente paso de la consulta (HU4).
 * Al ser presionado, despacha el evento `ConsultaEventos.PASO_SIGUIENTE`.
 *
 * @extends OfiucoButton
 * @fires CustomEvent#ConsultaEventos.PASO_SIGUIENTE
 */
export class NextButton extends OfiucoButton {
  /** @type {string} Etiqueta visible por defecto del botón. */
  static defaultLabel = "Guardar y avanzar";

  /** @type {string} Nombre del ícono por defecto mostrado junto a la etiqueta. */
  static defaultIcon = "next";

  /** @type {string} Variante visual primaria por defecto. */
  static defaultVariant = "primary";

  /** @type {boolean} Indica que el botón muestra tanto su ícono como su etiqueta textual. */
  static defaultIconOnly = false;

  /** @type {string} Evento personalizado emitido al hacer clic en el botón. */
  static eventName = ConsultaEventos.PASO_SIGUIENTE;
}

defineOnce("ofiuco-next-button", NextButton);
export default NextButton;