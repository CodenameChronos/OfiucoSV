/**
 * @fileoverview Servicio de acceso a datos para el recurso REST anidado
 * `consultaProcedimiento/{idConsultaProcedimiento}/paso`. Extiende `DefaultService`
 * vinculando las operaciones CRUD a un procedimiento de consulta específico y
 * deserializando las respuestas mediante la entidad `ConsultaProcedimientoPaso`.
 */

import DefaultService from "./default_service.js";
import ConsultaProcedimientoPaso from "../entity/consultaProcedimientoPaso.js";

/**
 * Resource: consultaProcedimiento/{idConsultaProcedimiento}/paso
 * @param {string} idConsultaProcedimiento uuid del padre en la ruta (consulta_procedimiento)
 */
export default class ConsultaProcedimientoPasoService extends DefaultService {
  /**
   * Inicializa el servicio validando la presencia de `idConsultaProcedimiento` y configurando
   * la ruta base del subrecurso y la clase de entidad `ConsultaProcedimientoPaso`.
   *
   * @param {string} idConsultaProcedimiento - UUID del procedimiento de consulta padre en la ruta REST (`consulta_procedimiento`).
   * @throws {TypeError} Si `idConsultaProcedimiento` no es proporcionado o es vacío.
   */
  constructor(idConsultaProcedimiento) {
    super();
    if (!idConsultaProcedimiento) {
      throw new TypeError("idConsultaProcedimiento es obligatorio");
    }
    this.URL = `${this._BASE_URL}consultaProcedimiento/${idConsultaProcedimiento}/paso`;
    this.EntityClass = ConsultaProcedimientoPaso;
  }
}