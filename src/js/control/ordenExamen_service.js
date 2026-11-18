/**
 * @fileoverview Servicio de acceso a datos para el recurso REST anidado
 * `consultaProcedimientoPaso/{idConsultaProcedimientoPaso}/ordenExamen`
 * Extiende `DefaultService` vinculando las operaciones CRUD a un paso específico de un
 * procedimiento de consulta y deserializando las respuestas mediante la entidad `OrdenExamen`
 */

import DefaultService from "./default_service.js";
import OrdenExamen from "../entity/ordenExamen.js";

/**
 * Resource: consultaProcedimientoPaso/{idConsultaProcedimientoPaso}/ordenExamen
 * @param {string} idConsultaProcedimientoPaso uuid del padre en la ruta (consulta_procedimiento_paso)
 */
export default class OrdenExamenService extends DefaultService {
  /**
   * Inicializa el servicio validando la presencia de `idConsultaProcedimientoPaso` y configurando
   * la ruta base del subrecurso y la clase de entidad `OrdenExamen`
   *
   * @param {string} idConsultaProcedimientoPaso - UUID del paso de procedimiento padre en la ruta REST (`consulta_procedimiento_paso`)
   * @throws {TypeError} Si `idConsultaProcedimientoPaso` no es proporcionado o es vacío
   */
  constructor(idConsultaProcedimientoPaso) {
    super();
    if (!idConsultaProcedimientoPaso) {
      throw new TypeError("idConsultaProcedimientoPaso es obligatorio");
    }
    this.URL = `${this._BASE_URL}consultaProcedimientoPaso/${idConsultaProcedimientoPaso}/ordenExamen`;
    this.EntityClass = OrdenExamen;
  }
}