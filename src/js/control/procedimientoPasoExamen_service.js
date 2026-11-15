import DefaultService from "./default_service.js";
import ProcedimientoPasoExamen from "../entity/procedimiento_paso_examen.js";

/**
 * Resource: examen/{idExamen}/paso
 * @param {string} idExamen uuid del padre en la ruta (examen)
 */
export default class ProcedimientoPasoExamenService extends DefaultService {
  constructor(idExamen) {
    super();
    if (!idExamen) {
      throw new TypeError("idExamen es obligatorio");
    }
    this.URL = `${this._BASE_URL}examen/${idExamen}/paso`;
    this.EntityClass = ProcedimientoPasoExamen;
  }
}
