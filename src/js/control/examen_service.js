import DefaultService from "./default_service.js";
import Examen from "../entity/examen.js";

export default class ExamenService extends DefaultService {
  constructor() {
    super();
    this.URL = `${this._BASE_URL}examen`;
    this.EntityClass = Examen;
  }
}
