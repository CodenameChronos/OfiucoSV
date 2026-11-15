import DefaultService from "./default_service.js";
import Procedimiento from "../entity/procedimiento.js";

export default class ProcedimientoService extends DefaultService {
  constructor() {
    super();
    this.URL = `${this._BASE_URL}procedimiento`;
    this.EntityClass = Procedimiento;
  }
}
