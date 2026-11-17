/**
 * @fileoverview Web Component `<ofiuco-end-button>` especializado en finalizar una consulta médica
 * dentro del flujo de atención (HU4). Extiende `<ofiuco-button>` configurando sus propiedades
 * visuales por defecto y el evento personalizado que emite al hacer clic.
 */

import { defineOnce } from "../../core/define-once.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import { OfiucoButton } from "./ofiuco-button.js";

/**
 * Componente web `<ofiuco-end-button>`.
 *
 * Botón especializado para finalizar la consulta médica (HU4).
 * Aplicable únicamente en el último paso del flujo de atención.
 * Al ser presionado, despacha el evento `ConsultaEventos.FINALIZAR`.
 *
 * @extends OfiucoButton
 * @fires CustomEvent#ConsultaEventos.FINALIZAR
 */
export class EndButton extends OfiucoButton {
  /** @type {string} Etiqueta visible por defecto del botón. */
  static defaultLabel = "Finalizar consulta";

  /** @type {string|null} Nombre del ícono por defecto (sin ícono). */
  static defaultIcon = null;

  /** @type {string} Variante visual primaria por defecto. */
  static defaultVariant = "primary";

  /** @type {boolean} Indica que el botón muestra su etiqueta textual. */
  static defaultIconOnly = false;

  /** @type {string} Evento personalizado emitido al hacer clic en el botón. */
  static eventName = ConsultaEventos.FINALIZAR;
}

defineOnce("ofiuco-end-button", EndButton);
export default EndButton;