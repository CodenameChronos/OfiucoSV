/**
 * @fileoverview Servicio de acceso a datos para el recurso REST anidado
 * `procedimiento/{idProcedimiento}/paso`. Extiende `DefaultService` vinculando
 * las operaciones CRUD a un procedimiento específico del catálogo y deserializando las
 * respuestas mediante la entidad `ProcedimientoPaso`.
 */

import DefaultService from "./default_service.js";
import ProcedimientoPaso from "../entity/procedimientoPaso.js";

/**
 * Resource: procedimiento/{idProcedimiento}/paso
 * @param {string} idProcedimiento uuid del padre en la ruta (procedimiento)
 */
export default class ProcedimientoPasoService extends DefaultService {
  /**
   * Inicializa el servicio validando la presencia de `idProcedimiento` y configurando
   * la ruta base del subrecurso y la clase de entidad `ProcedimientoPaso`.
   *
   * @param {string} idProcedimiento - UUID del procedimiento padre en la ruta REST (`procedimiento`).
   * @throws {TypeError} Si `idProcedimiento` no es proporcionado o es vacío.
   */
  constructor(idProcedimiento) {
    super();
    if (!idProcedimiento) {
      throw new TypeError("idProcedimiento es obligatorio");
    }
    this.URL = `${this._BASE_URL}procedimiento/${idProcedimiento}/paso`;
    this.EntityClass = ProcedimientoPaso;
  }
}