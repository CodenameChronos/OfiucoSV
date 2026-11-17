/**
 * @fileoverview Servicio de acceso a datos para la entidad `Clinica`.
 * Extiende `DefaultService` configurando el endpoint base `"clinica"` y
 * deserializando automáticamente las respuestas JSON del API en instancias de `Clinica`.
 */

import DefaultService from "./default_service.js";
import Clinica from "../entity/clinica.js";

/**
 * Servicio HTTP para operaciones CRUD y consulta de clínicas médicas.
 *
 * Hereda los métodos base de `DefaultService` apuntando al recurso `clinica`
 * y transforma tanto los listados paginados (`findRange`) como las consultas
 * individuales (`findById`) en objetos del modelo de dominio `Clinica`.
 *
 * @extends DefaultService
 */
class ClinicaService extends DefaultService {
  /**
   * Inicializa el servicio configurando la URL relativa hacia el recurso `"clinica"`.
   */
  constructor() {
    super();
    this.URL = this.URL + "clinica";
  }

  /**
   * Obtiene un rango paginado de clínicas y convierte cada registro crudo
   * en una instancia de `Clinica` mediante `Clinica.desdeJson`.
   *
   * @param {number} [first=0] - Índice inicial del primer registro a recuperar (base 0).
   * @param {number} [max=50] - Cantidad máxima de registros a devolver en la página.
   * @returns {Promise<{ registros: Clinica[], [key: string]: * }>} Respuesta paginada con `registros` transformados a instancias de `Clinica`.
   */
  findRange(first = 0, max = 50) {
    return super.findRange(first, max).then((resp) => {
      resp.registros = Array.isArray(resp.registros)
        ? resp.registros.map(Clinica.desdeJson)
        : [];
      return resp;
    });
  }

  /**
   * Busca una clínica específica por su identificador único (`uuid`) y la
   * transforma en una instancia de `Clinica`.
   *
   * @param {string|number} uuid - Identificador único de la clínica.
   * @returns {Promise<Clinica>} Instancia de `Clinica` correspondiente al registro encontrado.
   */
  findById(uuid) {
    return super.findById(uuid).then(Clinica.desdeJson);
  }
}

export default ClinicaService;