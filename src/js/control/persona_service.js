/**
 * @fileoverview Servicio de acceso a datos para el recurso REST `persona`
 * Extiende `DefaultService` configurando la ruta base hacia el registro de personas
 * y deserializando las respuestas JSON mediante la entidad `Persona`
 */

import DefaultService from "./default_service.js";
import Persona from "../entity/persona.js";

/**
 * Servicio HTTP para operaciones CRUD y consulta de personas registradas en el sistema
 *
 * Resource: `persona`
 *
 * Hereda todos los métodos estándar de `DefaultService` (`findAll`, `findRange`,
 * `findById`, `create`, `update`, `delete`) apuntando a `${this._BASE_URL}persona`
 * y convirtiendo los registros JSON en instancias de `Persona`
 *
 * @extends DefaultService
 */
export default class PersonaService extends DefaultService {
  /**
   * Inicializa el servicio configurando la URL del recurso `persona` y asignando
   * `Persona` como `EntityClass` para la deserialización automática
   */
  constructor() {
    super();
    this.URL = `${this._BASE_URL}persona`;
    this.EntityClass = Persona;
  }
}