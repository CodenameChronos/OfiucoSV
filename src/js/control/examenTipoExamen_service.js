import DefaultService from "./default_service.js";
import ExamenTipoExamen from "../entity/examen_tipo_examen.js";

/**
 * Resource: examen/{idExamen}/tipoExamen
 * @param {string} idExamen uuid del padre en la ruta (examen)
 */
export default class ExamenTipoExamenService extends DefaultService {
  constructor(idExamen) {
    super();
    if (!idExamen) {
      throw new TypeError("idExamen es obligatorio");
    }
    this.URL = `${this._BASE_URL}examen/${idExamen}/tipoExamen`;
    this.EntityClass = ExamenTipoExamen;
  }
}
