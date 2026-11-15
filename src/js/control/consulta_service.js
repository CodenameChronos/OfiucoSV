import DefaultService from "./default_service.js";
import DefaultError from "../entity/default_error.js";
import DefaultResponse from "../entity/default_response.js";
import Consulta from "../entity/consulta.js";

/**
 * Resource: persona-rol/{idPersonaRol}/consulta
 *
 * Dos formas de uso:
 *  - Anidado: `new ConsultaService(idPersonaRol)`. Los métodos heredados
 *    (findAll, findRange, findById, create, update, delete) operan sobre
 *    persona-rol/{idPersonaRol}/consulta. Es lo que usa AtencionService.
 *  - Sin padre: `new ConsultaService()`. Solo sirven los métodos que reciben
 *    el idPersonaRol por parámetro (findById(uuid, idPersonaRol),
 *    findRangeByPersonaRol, buscarConsultas).
 *
 * La entity Consulta debe exponer `static fromJSON(json)` (convención de
 * DefaultService).
 *
 * @param {string} [idPersonaRol] persona_rol al que pertenece la consulta
 */
export class ConsultaService extends DefaultService {
  constructor(idPersonaRol = null) {
    super();
    this.EntityClass = Consulta;
    this.URL = idPersonaRol
      ? this.#urlConsultas(idPersonaRol)
      : this._BASE_URL + "persona-rol";
  }

  #urlConsultas(idPersonaRol) {
    return `${this._BASE_URL}persona-rol/${encodeURIComponent(idPersonaRol)}/consulta`;
  }

  /**
   * Obtiene una consulta específica perteneciente a un persona-rol.
   * @param {string} uuid
   * @param {string} [idPersonaRol]
   * @returns {Promise<Consulta>}
   */
  findById(uuid, idPersonaRol = null) {
    if (!idPersonaRol) {
      // DefaultService.findById ya convierte con EntityClass
      return super.findById(uuid);
    }

    const errorSalida = new DefaultError();
    return new Promise((exito, rechazo) => {
      fetch(`${this.#urlConsultas(idPersonaRol)}/${encodeURIComponent(uuid)}`, {
        method: "GET",
      })
        .then((resp) => {
          if (resp.status === 200) {
            resp
              .json()
              .then((j) => exito(this.EntityClass.fromJSON(j)))
              .catch((e) => {
                errorSalida.mensaje = "Error al procesar respuesta";
                errorSalida.error = e;
                rechazo(errorSalida);
              });
          } else {
            errorSalida.mensaje = `Error al obtener el registro. Codigo: ${resp.status}`;
            errorSalida.error = resp.status;
            rechazo(errorSalida);
          }
        })
        .catch((err) => {
          errorSalida.mensaje = "Error al acceder al repositorio";
          errorSalida.error = err;
          rechazo(errorSalida);
        });
    });
  }

  /**
   * Lista las consultas paginadas de un registro persona-rol.
   * @param {string} idPersonaRol
   * @param {number} [first=0]
   * @param {number} [max=50]
   * @returns {Promise<DefaultResponse>}
   */
  findRangeByPersonaRol(idPersonaRol, first = 0, max = 50) {
    const errorSalida = new DefaultError();
    return new Promise((exito, rechazo) => {
      fetch(`${this.#urlConsultas(idPersonaRol)}?first=${first}&max=${max}`, {
        method: "GET",
      })
        .then((resp) => {
          if (resp.status === 200) {
            resp
              .json()
              .then((lista) => {
                const datos = new DefaultResponse();
                datos.registros = Array.isArray(lista)
                  ? lista.map((x) => this.EntityClass.fromJSON(x))
                  : [];
                datos.totalRegistros = parseInt(
                  resp.headers.get("Total-registros") ?? datos.registros.length,
                  10,
                );
                exito(datos);
              })
              .catch((e) => {
                errorSalida.mensaje = "Error al procesar respuesta";
                errorSalida.error = e;
                rechazo(errorSalida);
              });
          } else {
            errorSalida.mensaje = `Error al obtener consultas. Codigo: ${resp.status}`;
            errorSalida.error = resp.status;
            rechazo(errorSalida);
          }
        })
        .catch((err) => {
          errorSalida.mensaje = "Error al acceder al repositorio";
          errorSalida.error = err;
          rechazo(errorSalida);
        });
    });
  }

  /**
   * Busca consultas filtrando por criterio de paciente/clínica y rango de fechas.
   * Si se recibe idPersonaRol, consulta el endpoint REST directo y aplica los
   * filtros de clínica y fechas (desde/hasta).
   * @param {object} criterios
   * @param {string} [criterios.idPersonaRol]
   * @param {string} [criterios.idClinica]
   * @param {string|Date|null} [criterios.desde]
   * @param {string|Date|null} [criterios.hasta]
   * @returns {Promise<Consulta[]>}
   */
  async buscarConsultas({
    idPersonaRol = null,
    idClinica = null,
    desde = null,
    hasta = null,
  } = {}) {
    if (!idPersonaRol) {
      return [];
    }

    const respuesta = await this.findRangeByPersonaRol(idPersonaRol, 0, 50);
    return ConsultaService.filtrarConsultas(respuesta.registros, {
      idClinica,
      desde,
      hasta,
    });
  }

  /**
   * Filtra una colección de Consulta por clínica y rango de fechas [desde, hasta].
   * @param {Consulta[]} consultas
   * @param {object} filtros
   * @returns {Consulta[]}
   */
  static filtrarConsultas(
    consultas = [],
    { idClinica = null, desde = null, hasta = null } = {},
  ) {
    const fechaDesde = ConsultaService.#normalizarLimiteFecha(desde, false);
    const fechaHasta = ConsultaService.#normalizarLimiteFecha(hasta, true);

    return consultas.filter((consulta) => {
      if (idClinica) {
        const clinicaConsulta =
          consulta.clinica?.idClinica ?? consulta.clinica ?? null;
        if (clinicaConsulta && String(clinicaConsulta) !== String(idClinica)) {
          return false;
        }
      }

      if (fechaDesde || fechaHasta) {
        if (!(consulta.fechaInicio instanceof Date)) return false;
        const tiempo = consulta.fechaInicio.getTime();
        if (fechaDesde && tiempo < fechaDesde.getTime()) return false;
        if (fechaHasta && tiempo > fechaHasta.getTime()) return false;
      }

      return true;
    });
  }

  static #normalizarLimiteFecha(valor, finDeDia) {
    if (!valor) return null;
    if (valor instanceof Date) {
      const copia = new Date(valor.getTime());
      if (finDeDia) copia.setHours(23, 59, 59, 999);
      else copia.setHours(0, 0, 0, 0);
      return copia;
    }

    const texto = String(valor).trim();
    if (!texto) return null;
    const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const anio = Number(match[1]);
      const mes = Number(match[2]) - 1;
      const dia = Number(match[3]);
      return finDeDia
        ? new Date(anio, mes, dia, 23, 59, 59, 999)
        : new Date(anio, mes, dia, 0, 0, 0, 0);
    }

    const fecha = new Date(texto);
    if (Number.isNaN(fecha.getTime())) return null;
    if (finDeDia) fecha.setHours(23, 59, 59, 999);
    else fecha.setHours(0, 0, 0, 0);
    return fecha;
  }
}

export default ConsultaService;
