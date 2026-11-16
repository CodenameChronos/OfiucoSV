import DefaultService from "./default_service.js";
import ProcedimientoPasoExamen from "../entity/procedimiento_paso_examen.js";

/**
 * Resource: examen/{idExamen}/paso
 *
 * @param {string} [idExamen] uuid del examen en la ruta.
 */
export default class ProcedimientoPasoExamenService extends DefaultService {
  constructor(idExamen = null) {
    super();
    this.EntityClass = ProcedimientoPasoExamen;
    this.URL = idExamen
      ? `${this._BASE_URL}examen/${idExamen}/paso`
      : `${this._BASE_URL}examen`;
  }

  /**
   * Exámenes (procedimiento_paso_examen activos) que pueden asignarse en un
   * paso. Recorre todas las páginas.
   * @param {string} idProcedimiento uuid del procedimiento al que pertenece el paso
   * @param {string} idProcedimientoPaso uuid del paso
   * @returns {Promise<ProcedimientoPasoExamen[]>}
   * @throws {TypeError} si falta alguno de los dos ids
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
