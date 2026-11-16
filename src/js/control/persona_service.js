import DefaultService from "./default_service.js";
import Persona from "../entity/Persona.js";

export default class PersonaService extends DefaultService {
  constructor() {
    super();
    this.URL = `${this._BASE_URL}persona`;
    this.EntityClass = Persona;
  }
}
