import { defineOnce } from "../../core/define-once.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import { OfiucoButton } from "./ofiuco-button.js";

/** Guardar y avanzar al siguiente paso (HU4). */
export class NextButton extends OfiucoButton {
  static defaultLabel = "Guardar y avanzar";
  static defaultIcon = "next";
  static defaultVariant = "primary";
  static defaultIconOnly = false;
  static eventName = ConsultaEventos.PASO_SIGUIENTE;
}

defineOnce("ofiuco-next-button", NextButton);
export default NextButton;
