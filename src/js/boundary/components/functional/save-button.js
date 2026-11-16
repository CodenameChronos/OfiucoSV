import { defineOnce } from "../../core/define-once.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import { OfiucoButton } from "./ofiuco-button.js";

/** Guardar los cambios del paso actual sin avanzar (HU4). */
export class SaveButton extends OfiucoButton {
  static defaultLabel = "Guardar cambios";
  static defaultIcon = null;
  static defaultVariant = "secondary";
  static defaultIconOnly = false;
  static eventName = ConsultaEventos.GUARDAR;
}

defineOnce("ofiuco-save-button", SaveButton);
export default SaveButton;
