import DefaultService from "./default_service.js";
import Consulta from "../entity/consulta.js";

class ConsultaService extends DefaultService {
  constructor() {
    super();
    this.URL = this.URL + "consulta";
  }

  /**
   * Sobrescribe findById para devolver una Consulta en lugar de JSON plano.
   * @param {string} uuid
   * @returns {Promise<Consulta>}
   */
  findById(uuid) {
    return super.findById(uuid).then(Consulta.desdeJson);
  }

  filtrarPendientesPorFechaYNombre() {}
}
