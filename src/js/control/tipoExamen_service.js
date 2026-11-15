import DefaultService from "./default_service.js";
import TipoExamen from "../entity/tipo_examen.js";

export default class TipoExamenService extends DefaultService {
  constructor() {
    super();
    this.URL = `${this._BASE_URL}tipoExamen`;
    this.EntityClass = TipoExamen;
  }
}
