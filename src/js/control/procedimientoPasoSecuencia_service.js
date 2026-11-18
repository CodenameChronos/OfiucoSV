/**
 * @fileoverview Servicio de acceso a datos para el recurso REST anidado
 * `procedimiento/{idProcedimiento}/secuencia`. Extiende `DefaultService` vinculando
 * las operaciones CRUD al flujo secuencial de pasos de un procedimiento clínico y
 * deserializando las respuestas mediante la entidad `ProcedimientoPasoSecuencia`.
 */

import DefaultService from "./default_service.js";
import ProcedimientoPasoSecuencia from "../entity/procedimientoPasoSecuencia.js";

/**
 * Resource: procedimiento/{idProcedimiento}/secuencia
 * @param {string} idProcedimiento uuid del padre en la ruta (procedimiento)
 */
export default class ProcedimientoPasoSecuenciaService extends DefaultService {
  /**
   * Inicializa el servicio validando la presencia de `idProcedimiento` y configurando
   * la ruta base del subrecurso y la clase de entidad `ProcedimientoPasoSecuencia`.
   *
   * @param {string} idProcedimiento - UUID del procedimiento padre en la ruta REST (`procedimiento`).
   * @throws {TypeError} Si `idProcedimiento` no es proporcionado o es vacío.
   */
  constructor(idProcedimiento) {
    super();
    if (!idProcedimiento) {
      throw new TypeError("idProcedimiento es obligatorio");
    }
    this.URL = `${this._BASE_URL}procedimiento/${idProcedimiento}/secuencia`;
    this.EntityClass = ProcedimientoPasoSecuencia;
  }
}