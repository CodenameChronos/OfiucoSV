/**
 * @fileoverview Servicio de acceso a datos para el recurso REST anidado
 * `examen/{idExamen}/tipoExamen` Extiende `DefaultService` vinculando
 * las operaciones CRUD a un examen específico y deserializando las respuestas
 * mediante la entidad `ExamenTipoExamen`
 */

import DefaultService from "./default_service.js";
import ExamenTipoExamen from "../entity/examenTipoExamen.js";

/**
 * Servicio HTTP para gestionar la relación entre un examen clínico y sus tipos de examen asociados
 *
 * Resource: `examen/{idExamen}/tipoExamen`
 *
 * Hereda todos los métodos estándar de `DefaultService` (`findAll`, `findRange`,
 * `findById`, `create`, `update`, `delete`) operando bajo el contexto obligatorio
 * de `idExamen` y convirtiendo los registros JSON a instancias de `ExamenTipoExamen`
 *
 * @extends DefaultService
 */
export default class ExamenTipoExamenService extends DefaultService {
  /**
   * Inicializa el servicio validando la presencia de `idExamen` y configurando
   * la ruta base del subrecurso y la clase de entidad `ExamenTipoExamen`
   *
   * @param {string} idExamen - UUID del examen padre en la ruta REST (`examen`)
   * @throws {TypeError} Si `idExamen` no es proporcionado o es vacío
   */
  constructor(idExamen) {
    super();
    if (!idExamen) {
      throw new TypeError("idExamen es obligatorio");
    }
    this.URL = `${this._BASE_URL}examen/${idExamen}/tipoExamen`;
    this.EntityClass = ExamenTipoExamen;
  }
}