import DefaultService from "./default_service.js";
import PersonaRol from "../entity/personaRol.js";

export default class PersonaRolService extends DefaultService {
  constructor(idPersona = null) {
    super();
    this.EntityClass = PersonaRol;
    // Si no hay idPersona, apuntamos a una ruta genérica o manejamos el listado
    this.URL = idPersona
      ? `${this._BASE_URL}persona/${encodeURIComponent(idPersona)}/persona-rol`
      : `${this._BASE_URL}persona-rol`;
  }

  async listarPersonalDeClinica(idClinica) {
    const response = await fetch(
      `${this._BASE_URL}clinica/${encodeURIComponent(idClinica)}/personal`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("No se pudo obtener el personal de la clínica");
    }

    const data = await response.json();
    return data.map((item) => new this.EntityClass(item));
  }
}
