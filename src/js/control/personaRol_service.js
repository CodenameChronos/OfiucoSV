import DefaultService from "./default_service.js";
import PersonaRol from "../entity/personaRol.js";

/**
 * Resource: persona/{idPersona}/persona-rol
 *
 * También sabe listar el personal de una clínica (los persona_rol que no son
 * de paciente), por clinica/{idClinica}/personal (método de ClinicaResource
 * en el backend).
 *
 * @param {string} [idPersona] uuid de la persona en la ruta. Con él, los
 *        métodos heredados operan sobre persona/{idPersona}/persona-rol. Sin
 *        él, solo sirve listarPersonalDeClinica.
 */
export default class PersonaRolService extends DefaultService {
  constructor(idPersona = null) {
    super();
    this.EntityClass = PersonaRol;
    this.URL = idPersona
      ? `${this._BASE_URL}persona/${idPersona}/persona-rol`
      : `${this._BASE_URL}persona`;
  }

  /**
   * Personal de una clínica (persona_rol distinto de paciente). Recorre todas
   * las páginas.
   * @param {string} idClinica
   * @returns {Promise<PersonaRol[]>}
   * @throws {TypeError} si falta el id de la clínica
   */
  listarPersonalDeClinica(idClinica) {
    if (!idClinica) {
      throw new TypeError("idClinica es obligatorio");
    }
    // Instancia aparte: findAll consulta la URL en cada página
    const personal = new PersonaRolService();
    personal.URL = `${this._BASE_URL}clinica/${idClinica}/personal`;
    return personal.findAll();
  }
}
