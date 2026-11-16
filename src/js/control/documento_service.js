import DefaultService from "./default_service.js";
import Documento from "../entity/documento.js";

/**
 * Resource: persona/{idPersona}/documento
 * Recupera los documentos asociados a una persona.
 */
export default class DocumentoService extends DefaultService {
  constructor(idPersona) {
    super();

    if (!idPersona) {
      throw new TypeError("idPersona es obligatorio");
    }

    this.URL = `${this._BASE_URL}persona/${idPersona}/documento`;
    this.EntityClass = Documento;
  }
}
