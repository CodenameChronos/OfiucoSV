/**
 * @fileoverview Servicio de acceso a datos para el recurso REST `tipoDocumento`.
 * Extiende `DefaultService` configurando la ruta base hacia el catálogo de tipos de
 * documento de identidad y deserializando las respuestas mediante la entidad `TipoDocumento`.
 */

import DefaultService from "./default_service.js";
import TipoDocumento from "../entity/tipoDocumento.js";

/**
 * Servicio HTTP para operaciones CRUD y consulta del catálogo de tipos de documento.
 *
 * Resource: `tipoDocumento`
 *
 * Hereda todos los métodos estándar de `DefaultService` (`findAll`, `findRange`,
 * `findById`, `create`, `update`, `delete`) apuntando a `${this._BASE_URL}tipoDocumento`
 * y convirtiendo los registros JSON en instancias de `TipoDocumento`.
 *
 * @extends DefaultService
 */
export default class TipoDocumentoService extends DefaultService {
  /**
   * Inicializa el servicio configurando la URL del recurso `tipoDocumento` y asignando
   * `TipoDocumento` como `EntityClass` para la deserialización automática.
   */
  constructor() {
    super();
    this.URL = `${this._BASE_URL}tipoDocumento`;
    this.EntityClass = TipoDocumento;
  }
}