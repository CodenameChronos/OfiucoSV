/**
 * @fileoverview Servicio de acceso a datos para el recurso REST `procedimiento`.
 * Extiende `DefaultService` configurando la ruta base hacia el catálogo de procedimientos
 * clínicos y deserializando las respuestas mediante la entidad `Procedimiento`.
 */

import DefaultService from "./default_service.js";
import Procedimiento from "../entity/procedimiento.js";

/**
 * Servicio HTTP para operaciones CRUD y consulta del catálogo de procedimientos clínicos.
 *
 * Resource: `procedimiento`
 *
 * Hereda todos los métodos estándar de `DefaultService` (`findAll`, `findRange`,
 * `findById`, `create`, `update`, `delete`) apuntando a `${this._BASE_URL}procedimiento`
 * y convirtiendo los registros JSON en instancias de `Procedimiento`.
 *
 * @extends DefaultService
 */
export default class ProcedimientoService extends DefaultService {
  /**
   * Inicializa el servicio configurando la URL del recurso `procedimiento` y asignando
   * `Procedimiento` como `EntityClass` para la deserialización automática.
   */
  constructor() {
    super();
    this.URL = `${this._BASE_URL}procedimiento`;
    this.EntityClass = Procedimiento;
  }
}