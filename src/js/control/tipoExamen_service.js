import DefaultService from "./default_service.js";
import TipoExamen from "../entity/tipoExamen.js";

export default class TipoExamenService extends DefaultService {
  constructor() {
    super();
    this.URL = `${this._BASE_URL}tipoExamen`;
    this.EntityClass = TipoExamen;
  }
}
