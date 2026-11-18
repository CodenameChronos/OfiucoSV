/**
 * @fileoverview Servicio de acceso a datos para el recurso REST anidado
 * `ordenExamen/{idOrdenExamen}/resultado`. Extiende `DefaultService` vinculando
 * las operaciones CRUD a una orden de examen específica y deserializando las respuestas
 * mediante la entidad `ExamenResultado`.
 */

import DefaultService from "./default_service.js";
import ExamenResultado from "../entity/examenResultado.js";

/**
 * Servicio HTTP para gestionar los resultados clínicos asociados a una orden de examen
 
 * Hereda todos los métodos estándar de `DefaultService` (`findAll`, `findRange`,
 * `findById`, `create`, `update`, `delete`) operando bajo el contexto obligatorio
 * de `idOrdenExamen` y convirtiendo los registros JSON a instancias de `ExamenResultado`.
 *
 * @extends DefaultService
 */
export default class ExamenResultadoService extends DefaultService {
  /**
   * Inicializa el servicio validando la presencia de `idOrdenExamen` y configurando
   * la ruta base del subrecurso y la clase de entidad `ExamenResultado`.
   *
   * @param {string} idOrdenExamen - UUID de la orden de examen padre en la ruta REST.
   * @throws {TypeError} Si `idOrdenExamen` no es proporcionado o es vacío.
   */
  constructor(idOrdenExamen) {
    super();
    if (!idOrdenExamen) {
      throw new TypeError("idOrdenExamen es obligatorio");
    }
    this.URL = `${this._BASE_URL}ordenExamen/${idOrdenExamen}/resultado`;
    this.EntityClass = ExamenResultado;
  }
}