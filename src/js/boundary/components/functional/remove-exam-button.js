import { defineOnce } from "../../core/define-once.js";
import { ConsultaEventos } from "../../core/eventos-consulta.js";
import { OfiucoButton } from "./ofiuco-button.js";

/** Quitar un examen asignado (HU4). El id del examen viaja en el atributo value. */
export class RemoveExamButton extends OfiucoButton {
  static defaultLabel = "Quitar examen";
  static defaultIcon = "close";
  static defaultVariant = "secondary";
  static defaultIconOnly = true;
  static eventName = ConsultaEventos.QUITAR_EXAMEN;
}

defineOnce("ofiuco-remove-exam-button", RemoveExamButton);
export default RemoveExamButton;
