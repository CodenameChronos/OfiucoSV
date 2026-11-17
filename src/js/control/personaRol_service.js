/**
 * @fileoverview Servicio de acceso a datos para las asignaciones de roles de personas
 * (`persona/{idPersona}/persona-rol` o `persona-rol`) y consulta de personal por clínica
 * (`clinica/{idClinica}/personal`). Extiende `DefaultService` y deserializa los
 * registros mediante la entidad `PersonaRol`.
 */

import DefaultService from "./default_service.js";
import PersonaRol from "../entity/personaRol.js";

/**
 * Servicio HTTP para gestionar la relación `PersonaRol` y consultar el personal
 * asignado a una clínica específica.
 *
 * Resources:
 * - Anidado por persona: `persona/{idPersona}/persona-rol`
 * - Genérico: `persona-rol`
 * - Personal por clínica: `clinica/{idClinica}/personal`
 *
 * @extends DefaultService
 */
export default class PersonaRolService extends DefaultService {
  /**
   * Inicializa el servicio asignando `PersonaRol` como `EntityClass` y configurando
   * la URL base hacia el subrecurso de una persona o hacia el recurso genérico `persona-rol`.
   *
   * @param {string|number|null} [idPersona=null] - Identificador opcional de la persona propietaria.
   */
  constructor(idPersona = null) {
    super();
    this.EntityClass = PersonaRol;
    this.URL = idPersona
      ? `${this._BASE_URL}persona/${encodeURIComponent(idPersona)}/persona-rol`
      : `${this._BASE_URL}persona-rol`;
  }

  /**
   * Obtiene el listado del personal asignado a una clínica específica consumiendo
   * `GET clinica/{idClinica}/personal` y convirtiendo cada elemento en una instancia
   * de `PersonaRol`.
   *
   * @param {string|number} idClinica - Identificador único de la clínica.
   * @returns {Promise<PersonaRol[]>} Arreglo de instancias de `PersonaRol` del personal de la clínica.
   * @throws {Error} Si la respuesta HTTP no es exitosa (`!response.ok`).
   */
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