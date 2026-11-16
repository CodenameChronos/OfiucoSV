import DefaultService from "./default_service.js";
import ConsultaProcedimiento from "../entity/consultaProcedimiento.js";

/**
 * Resource: consulta/{idConsulta}/procedimiento
 * @param {string} idConsulta uuid del padre en la ruta (consulta)
 */
export default class ConsultaProcedimientoService extends DefaultService {
  constructor(idConsulta) {
    super();
    if (!idConsulta) {
      throw new TypeError("idConsulta es obligatorio");
    }
    this.URL = `${this._BASE_URL}consulta/${idConsulta}/procedimiento`;
    this.EntityClass = ConsultaProcedimiento;
  }
}
