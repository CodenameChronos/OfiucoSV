import DefaultService from "./default_service.js";
import Consulta from "../entity/consulta.js";

/**
 * Resource: persona-rol/{idPersonaRol}/consulta
 * @param {string} idPersonaRol uuid del padre en la ruta (persona_rol al que pertenece la consulta)
 */
export default class ConsultaService extends DefaultService {
  constructor(idPersonaRol) {
    super();
    if (!idPersonaRol) {
      throw new TypeError("idPersonaRol es obligatorio");
    }
    this.URL = `${this._BASE_URL}persona-rol/${idPersonaRol}/consulta`;
    this.EntityClass = Consulta;
  }
}
