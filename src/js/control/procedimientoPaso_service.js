import DefaultService from "./default_service.js";
import ProcedimientoPaso from "../entity/procedimiento_paso.js";

/**
 * Resource: procedimiento/{idProcedimiento}/paso
 * @param {string} idProcedimiento uuid del padre en la ruta (procedimiento)
 */
export default class ProcedimientoPasoService extends DefaultService {
  constructor(idProcedimiento) {
    super();
    if (!idProcedimiento) {
      throw new TypeError("idProcedimiento es obligatorio");
    }
    this.URL = `${this._BASE_URL}procedimiento/${idProcedimiento}/paso`;
    this.EntityClass = ProcedimientoPaso;
  }
}
