import DefaultService from "./default_service.js";
import ExamenResultado from "../entity/examenResultado.js";

/**
 * Resource: ordenExamen/{idOrdenExamen}/resultado
 * @param {string} idOrdenExamen uuid del padre en la ruta (orden de examen)
 */
export default class ExamenResultadoService extends DefaultService {
  constructor(idOrdenExamen) {
    super();
    if (!idOrdenExamen) {
      throw new TypeError("idOrdenExamen es obligatorio");
    }
    this.URL = `${this._BASE_URL}ordenExamen/${idOrdenExamen}/resultado`;
    this.EntityClass = ExamenResultado;
  }
}
