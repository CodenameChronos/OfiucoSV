/**
 * @fileoverview Servicio de acceso a datos para la relación entre pasos de procedimiento
 * y exámenes clínicos (`examen/{idExamen}/paso` y `procedimiento/{idProcedimiento}/paso/{idProcedimientoPaso}/examen`).
 * Extiende `DefaultService` y deserializa las respuestas mediante la entidad `ProcedimientoPasoExamen`.
 */

import DefaultService from "./default_service.js";
import ProcedimientoPasoExamen from "../entity/procedimientoPasoExamen.js";

/**
 * Resource: examen/{idExamen}/paso
 *
 * @param {string} [idExamen] uuid del examen en la ruta.
 */
export default class ProcedimientoPasoExamenService extends DefaultService {
  /**
   * Inicializa el servicio asignando `ProcedimientoPasoExamen` como `EntityClass` y configurando
   * la ruta base según si se especifica un `idExamen` padre.
   *
   * @param {string|null} [idExamen=null] - UUID opcional del examen en la ruta (`examen/{idExamen}/paso`).
   */
  constructor(idExamen = null) {
    super();
    this.EntityClass = ProcedimientoPasoExamen;
    this.URL = idExamen
      ? `${this._BASE_URL}examen/${idExamen}/paso`
      : `${this._BASE_URL}examen`;
  }

  /**
   * Recupera todos los exámenes (`procedimiento_paso_examen` activos) que pueden asignarse
   * en un paso específico de un procedimiento clínico, recorriendo todas las páginas mediante `findAll()`.
   *
   * @param {string} idProcedimiento - UUID del procedimiento al que pertenece el paso.
   * @param {string} idProcedimientoPaso - UUID del paso dentro del procedimiento.
   * @returns {Promise<ProcedimientoPasoExamen[]>} Promesa con el arreglo completo de asociaciones `ProcedimientoPasoExamen`.
   * @throws {TypeError} Si `idProcedimiento` o `idProcedimientoPaso` no son proporcionados.
   */
  listarPorProcedimientoPaso(idProcedimiento, idProcedimientoPaso) {
    if (!idProcedimiento) {
      throw new TypeError("idProcedimiento es obligatorio");
    }
    if (!idProcedimientoPaso) {
      throw new TypeError("idProcedimientoPaso es obligatorio");
    }
    const porPaso = new ProcedimientoPasoExamenService();
    porPaso.URL = `${this._BASE_URL}procedimiento/${idProcedimiento}/paso/${idProcedimientoPaso}/examen`;
    return porPaso.findAll();
  }
}