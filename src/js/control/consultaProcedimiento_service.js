/**
 * @fileoverview Servicio de acceso a datos para el recurso REST anidado
 * `consulta/{idConsulta}/procedimiento`. Extiende `DefaultService` vinculando
 * las operaciones CRUD a una consulta específica y deserializando las respuestas
 * mediante la entidad `ConsultaProcedimiento`.
 */

import DefaultService from "./default_service.js";
import ConsultaProcedimiento from "../entity/consultaProcedimiento.js";

/**
 * Servicio HTTP para gestionar los procedimientos clínicos asociados a una consulta.
 *
 * Resource: `consulta/{idConsulta}/procedimiento`
 *
 * Hereda todos los métodos estándar de `DefaultService` (`findAll`, `findRange`,
 * `findById`, `create`, `update`, `delete`) operando bajo el contexto obligatorio
 * de `idConsulta` y convirtiendo los registros JSON a instancias de `ConsultaProcedimiento`.
 *
 * @extends DefaultService
 */
export default class ConsultaProcedimientoService extends DefaultService {
  /**
   * Inicializa el servicio validando la presencia de `idConsulta` y configurando
   * la ruta base del subrecurso y la clase de entidad `ConsultaProcedimiento`.
   *
   * @param {string} idConsulta - UUID de la consulta padre en la ruta REST.
   * @throws {TypeError} Si `idConsulta` no es proporcionado o es vacío.
   */
  constructor(idConsulta) {
    super();
    if (!idConsulta) {
      throw new TypeError("idConsulta es obligatorio");
    }
    this.URL = `${this._BASE_URL}consulta/${idConsulta}/procedimiento`;
    this.EntityClass = ConsultaProcedimiento;
  }
}