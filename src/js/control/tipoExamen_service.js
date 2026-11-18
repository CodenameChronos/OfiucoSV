/**
 * @fileoverview Servicio de acceso a datos para el recurso REST `tipoExamen`.
 * Extiende `DefaultService` configurando la ruta base hacia el catálogo de tipos de
 * examen clínico y deserializando las respuestas mediante la entidad `TipoExamen`.
 */

import DefaultService from "./default_service.js";
import TipoExamen from "../entity/tipoExamen.js";

/**
 * Servicio HTTP para operaciones CRUD y consulta del catálogo de tipos de examen clínico.
 *
 * Resource: `tipoExamen`
 *
 * Hereda todos los métodos estándar de `DefaultService` (`findAll`, `findRange`,
 * `findById`, `create`, `update`, `delete`) apuntando a `${this._BASE_URL}tipoExamen`
 * y convirtiendo los registros JSON en instancias de `TipoExamen`.
 *
 * @extends DefaultService
 */
export default class TipoExamenService extends DefaultService {
  /**
   * Inicializa el servicio configurando la URL del recurso `tipoExamen` y asignando
   * `TipoExamen` como `EntityClass` para la deserialización automática.
   */
  constructor() {
    super();
    this.URL = `${this._BASE_URL}tipoExamen`;
    this.EntityClass = TipoExamen;
  }
}