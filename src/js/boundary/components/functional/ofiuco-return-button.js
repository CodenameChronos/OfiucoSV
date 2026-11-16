import { defineOnce } from "../../core/define-once.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import { OfiucoButton } from "./ofiuco-button.js";

/** Volver de la consulta al dashboard (HU4). Solo ícono. */
export class ReturnButton extends OfiucoButton {
  static defaultLabel = "Regresar al dashboard";
  static defaultIcon = "back";
  static defaultVariant = "secondary";
  static defaultIconOnly = true;
  static eventName = ConsultaEventos.REGRESAR;
}

defineOnce("ofiuco-return-button", ReturnButton);
export default ReturnButton;
