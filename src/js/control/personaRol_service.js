import DefaultService from "./default_service.js";
import PersonaRol from "../entity/persona_rol.js";

/**
 * Resource: persona/{idPersona}/persona-rol
 * @param {string} idPersona uuid del padre en la ruta (persona)
 */
export default class PersonaRolService extends DefaultService {
  constructor(idPersona) {
    super();
    if (!idPersona) {
      throw new TypeError("idPersona es obligatorio");
    }
    this.URL = `${this._BASE_URL}persona/${idPersona}/persona-rol`;
    this.EntityClass = PersonaRol;
  }
}
