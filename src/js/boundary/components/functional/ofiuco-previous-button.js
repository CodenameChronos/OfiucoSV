import { defineOnce } from "../../core/define-once.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import { OfiucoButton } from "./ofiuco-button.js";

/** Guardar y retroceder al paso anterior (HU4). */
export class PreviousButton extends OfiucoButton {
  static defaultLabel = "Anterior";
  static defaultIcon = "prev";
  static defaultVariant = "secondary";
  static defaultIconOnly = false;
  static eventName = ConsultaEventos.PASO_ANTERIOR;
}

defineOnce("ofiuco-previous-button", PreviousButton);
export default PreviousButton;
