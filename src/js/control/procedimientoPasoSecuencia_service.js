import DefaultService from "./default_service.js";
import ProcedimientoPasoSecuencia from "../entity/procedimiento_paso_secuencia.js";

/**
 * Resource: procedimiento/{idProcedimiento}/secuencia
 * @param {string} idProcedimiento uuid del padre en la ruta (procedimiento)
 */
export default class ProcedimientoPasoSecuenciaService extends DefaultService {
  constructor(idProcedimiento) {
    super();
    if (!idProcedimiento) {
      throw new TypeError("idProcedimiento es obligatorio");
    }
    this.URL = `${this._BASE_URL}procedimiento/${idProcedimiento}/secuencia`;
    this.EntityClass = ProcedimientoPasoSecuencia;
  }
}
