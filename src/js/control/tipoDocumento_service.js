import DefaultService from "./default_service.js";

class TipoDocumentoService extends DefaultService {
  constructor() {
    super();
    this.URL += "tipoDocumento";
  }
}

export default TipoDocumentoService;