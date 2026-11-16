import { defineOnce } from "../../core/define-once.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import { OfiucoButton } from "./ofiuco-button.js";

/** Finalizar la consulta (HU4). Solo aplica en el último paso. */
export class EndButton extends OfiucoButton {
  static defaultLabel = "Finalizar consulta";
  static defaultIcon = null;
  static defaultVariant = "primary";
  static defaultIconOnly = false;
  static eventName = ConsultaEventos.FINALIZAR;
}

defineOnce("ofiuco-end-button", EndButton);
export default EndButton;
