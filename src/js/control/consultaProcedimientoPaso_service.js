import DefaultService from "./default_service.js";
import ConsultaProcedimientoPaso from "../entity/consultaProcedimientoPaso.js";

/**
 * Resource: consultaProcedimiento/{idConsultaProcedimiento}/paso
 * @param {string} idConsultaProcedimiento uuid del padre en la ruta (consulta_procedimiento)
 */
export default class ConsultaProcedimientoPasoService extends DefaultService {
  constructor(idConsultaProcedimiento) {
    super();
    if (!idConsultaProcedimiento) {
      throw new TypeError("idConsultaProcedimiento es obligatorio");
    }
    this.URL = `${this._BASE_URL}consultaProcedimiento/${idConsultaProcedimiento}/paso`;
    this.EntityClass = ConsultaProcedimientoPaso;
  }
}
