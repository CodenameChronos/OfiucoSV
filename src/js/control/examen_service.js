/**
 * @fileoverview Servicio de acceso a datos para el recurso REST `examen`
 * Extiende `DefaultService` configurando la ruta base hacia el catálogo de exámenes
 * clínicos y deserializando las respuestas mediante la entidad `Examen`
 */

import DefaultService from "./default_service.js";
import Examen from "../entity/examen.js";

/**
 * Servicio HTTP para operaciones CRUD y consulta del catálogo de exámenes clínicos
 * @extends DefaultService
 */
export default class ExamenService extends DefaultService {
  /**
   * Inicializa el servicio configurando la URL del recurso `examen` y asignando
   * `Examen` como `EntityClass` para la deserialización automática
   */
  constructor() {
    super();
    this.URL = `${this._BASE_URL}examen`;
    this.EntityClass = Examen;
  }
}