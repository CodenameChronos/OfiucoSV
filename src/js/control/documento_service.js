/**
 * @fileoverview Servicio de acceso a datos para el recurso REST anidado
 * `persona/{idPersona}/documento`. Extiende `DefaultService` vinculando
 * las operaciones CRUD a una persona específica y deserializando las respuestas
 * mediante la entidad `Documento`
 */

import DefaultService from "./default_service.js";
import Documento from "../entity/documento.js";

/**
 * Servicio HTTP para gestionar y recuperar los documentos de identificación asociados a una persona
 *
 * Resource: `persona/{idPersona}/documento`
 *
 * Hereda todos los métodos estándar de `DefaultService` (`findAll`, `findRange`,
 * `findById`, `create`, `update`, `delete`) operando bajo el contexto obligatorio
 * de `idPersona` y convirtiendo los registros JSON a instancias de `Documento`.
 *
 * @extends DefaultService
 */
export default class DocumentoService extends DefaultService {
  /**
   * Inicializa el servicio validando la presencia de `idPersona` y configurando
   * la ruta base del subrecurso y la clase de entidad `Documento`
   *
   * @param {string|number} idPersona - Identificador único de la persona propietaria en la ruta REST[cite: 15].
   * @throws {TypeError} Si `idPersona` no es proporcionado o es vacío
   */
  constructor(idPersona) {
    super();

    if (!idPersona) {
      throw new TypeError("idPersona es obligatorio");
    }

    this.URL = `${this._BASE_URL}persona/${idPersona}/documento`;
    this.EntityClass = Documento;
  }
}