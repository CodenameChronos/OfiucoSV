import DefaultService from "./default_service.js";
import OrdenExamen from "../entity/orden_examen.js";

/**
 * Resource: consultaProcedimientoPaso/{idConsultaProcedimientoPaso}/ordenExamen
 * @param {string} idConsultaProcedimientoPaso uuid del padre en la ruta (consulta_procedimiento_paso)
 */
export default class OrdenExamenService extends DefaultService {
  constructor(idConsultaProcedimientoPaso) {
    super();
    if (!idConsultaProcedimientoPaso) {
      throw new TypeError("idConsultaProcedimientoPaso es obligatorio");
    }
    this.URL = `${this._BASE_URL}consultaProcedimientoPaso/${idConsultaProcedimientoPaso}/ordenExamen`;
    this.EntityClass = OrdenExamen;
  }
}
