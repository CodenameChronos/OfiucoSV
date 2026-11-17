import DefaultService from "./default_service.js";
import ProcedimientoPasoExamen from "../entity/procedimientoPasoExamen.js";

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
  async listarPorProcedimientoPaso(idProcedimiento, idProcedimientoPaso) {
    if (!idProcedimiento) {
      throw new TypeError("idProcedimiento es obligatorio");
    }
    if (!idProcedimientoPaso) {
      throw new TypeError("idProcedimientoPaso es obligatorio");
    }
    // Usa el endpoint existente @Path("examen/{idExamen}/paso")
    const porPaso = new ProcedimientoPasoExamenService(
      "00000000-0000-0000-0000-000000000000",
    );
    const todos = await porPaso.findAll();
    const idPasoNorm = String(idProcedimientoPaso).toLowerCase();

    return todos.filter((ppe) => {
      const idPasoPpe =
        typeof ppe.idProcedimientoPaso === "string"
          ? ppe.idProcedimientoPaso
          : ppe.idProcedimientoPaso?.idProcedimientoPaso;
      return (
        String(idPasoPpe ?? "").toLowerCase() === idPasoNorm &&
        ppe.activo !== false
      );
    });
  }
}
