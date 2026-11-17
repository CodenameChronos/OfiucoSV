/**
 * @fileoverview Web Component `<ofiuco-return-button>` especializado en regresar desde
 * la vista de consulta médica hacia el dashboard (HU4). Extiende `<ofiuco-button>`
 * configurándose como un botón de solo ícono (`back`) que despacha `ConsultaEventos.REGRESAR`.
 */

import { defineOnce } from "../../core/define-once.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import { OfiucoButton } from "./ofiuco-button.js";

/**
 * Componente web `<ofiuco-return-button>`.
 *
 * Botón de solo ícono especializado para volver de la consulta al dashboard (HU4).
 * Al ser presionado, despacha el evento `ConsultaEventos.REGRESAR`.
 *
 * @extends OfiucoButton
 * @fires CustomEvent#ConsultaEventos.REGRESAR
 */
export class ReturnButton extends OfiucoButton {
  /** @type {string} Etiqueta accesible por defecto (`aria-label` y `title`). */
  static defaultLabel = "Regresar al dashboard";

  /** @type {string} Nombre del ícono por defecto (`back`). */
  static defaultIcon = "back";

  /** @type {string} Variante visual secundaria por defecto. */
  static defaultVariant = "secondary";

  /** @type {boolean} Configura el botón en modo solo ícono por defecto. */
  static defaultIconOnly = true;

  /** @type {string} Evento personalizado emitido al hacer clic en el botón. */
  static eventName = ConsultaEventos.REGRESAR;
}

defineOnce("ofiuco-return-button", ReturnButton);
export default ReturnButton;