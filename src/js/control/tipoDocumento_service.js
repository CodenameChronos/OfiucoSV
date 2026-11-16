import DefaultService from "./default_service.js";
import TipoDocumento from "../entity/tipoDocumento.js";

export default class TipoDocumentoService extends DefaultService {
  constructor() {
    super();
    this.URL = `${this._BASE_URL}tipoDocumento`;
    this.EntityClass = TipoDocumento;
  }
}
