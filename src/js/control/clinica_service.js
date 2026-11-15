import DefaultService from "./default_service.js";
import Clinica from "../entity/clinica.js";

class ClinicaService extends DefaultService {
  constructor() {
    super();
    this.URL = this.URL + "clinica";
  }

  findRange(first = 0, max = 50) {
    return super.findRange(first, max).then((resp) => {
      resp.registros = Array.isArray(resp.registros)
        ? resp.registros.map(Clinica.desdeJson)
        : [];
      return resp;
    });
  }

  findById(uuid) {
    return super.findById(uuid).then(Clinica.desdeJson);
  }
}

export default ClinicaService;
