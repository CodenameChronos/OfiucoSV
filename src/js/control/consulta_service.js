/**
 * @fileoverview Servicio de acceso a datos para el recurso REST `persona-rol/{idPersonaRol}/consulta`.
 * Soporta tanto el modo anidado (configurando un `idPersonaRol` base en el constructor para
 * reutilizar los métodos CRUD heredados de `DefaultService`) como el modo directo sin padre
 * (pasando `idPersonaRol` por parámetro). Incluye además filtrado en cliente por clínica y rango
 * de fechas (`filtrarConsultas`) y descarga de comprobantes en formato PDF (`descargarTicketPdf`).
 */

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
 * @extends DefaultService
 */
export class ConsultaService extends DefaultService {
  /**
   * Inicializa el servicio de consultas asignando `Consulta` como `EntityClass`
   * y construyendo la URL base según si se recibe un `idPersonaRol` padre o no.
   *
   * @param {string|number|null} [idPersonaRol=null] - Identificador del registro `persona_rol` al que pertenecen las consultas.
   */
  constructor(idPersonaRol = null) {
    super();
    this.EntityClass = Consulta;
    this.URL = idPersonaRol
      ? this.#urlConsultas(idPersonaRol)
      : this._BASE_URL + "persona-rol";
  }

  /**
   * Construye la ruta REST base hacia la colección de consultas de un `persona-rol` específico.
   *
   * @param {string|number} idPersonaRol - Identificador del registro `persona_rol`.
   * @returns {string} URL codificada del recurso `persona-rol/{idPersonaRol}/consulta`.
   */
  #urlConsultas(idPersonaRol) {
    return `${this._BASE_URL}persona-rol/${encodeURIComponent(idPersonaRol)}/consulta`;
  }

  /**
   * Obtiene una consulta específica perteneciente a un `persona-rol`.
   * Si se omite `idPersonaRol`, delega directamente en `DefaultService.prototype.findById`.
   *
   * @param {string|number} uuid - Identificador único de la consulta.
   * @param {string|number|null} [idPersonaRol=null] - Identificador opcional del `persona-rol` propietario.
   * @returns {Promise<Consulta>} Instancia de `Consulta` deserializada desde la respuesta JSON.
   * @throws {DefaultError} Si falla la petición HTTP o el parseo de la respuesta.
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
   * Lista las consultas paginadas de un registro `persona-rol`, leyendo el encabezado
   * `Total-registros` para poblar la metadata de paginación en `DefaultResponse`.
   *
   * @param {string|number} idPersonaRol - Identificador del registro `persona_rol`.
   * @param {number} [first=0] - Índice inicial del primer registro a recuperar (base 0).
   * @param {number} [max=50] - Cantidad máxima de registros por página.
   * @returns {Promise<DefaultResponse>} Objeto `DefaultResponse` con `registros` (`Consulta[]`) y `totalRegistros`.
   * @throws {DefaultError} Si ocurre un error de red, HTTP distinto de 200 o de parseo JSON.
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
   * Si se recibe `idPersonaRol`, consulta el endpoint REST directo y aplica los
   * filtros de clínica y fechas (`desde`/`hasta`).
   *
   * @param {Object} [criterios={}] - Criterios de búsqueda y filtrado.
   * @param {string|number|null} [criterios.idPersonaRol=null] - Identificador del registro `persona_rol`.
   * @param {string|number|null} [criterios.idClinica=null] - Identificador de clínica para filtrar resultados.
   * @param {string|Date|null} [criterios.desde=null] - Límite inferior de fecha de inicio.
   * @param {string|Date|null} [criterios.hasta=null] - Límite superior de fecha de inicio.
   * @returns {Promise<Consulta[]>} Lista filtrada de instancias de `Consulta` (vacía si falta `idPersonaRol`).
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
   * Filtra una colección de `Consulta` por clínica y rango de fechas `[desde, hasta]`
   * (comparando contra `consulta.fechaInicio`).
   *
   * @param {Consulta[]} [consultas=[]] - Colección de consultas a filtrar.
   * @param {Object} [filtros={}] - Parámetros de filtrado.
   * @param {string|number|null} [filtros.idClinica=null] - ID de clínica requerida.
   * @param {string|Date|null} [filtros.desde=null] - Fecha mínima inclusiva (00:00:00.000).
   * @param {string|Date|null} [filtros.hasta=null] - Fecha máxima inclusiva (23:59:59.999).
   * @returns {Consulta[]} Subconjunto de consultas que cumplen todos los criterios.
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

  /**
   * Normaliza un valor de fecha (`Date`, cadena `YYYY-MM-DD` o fecha parseable) ajustando
   * su hora local al inicio del día (`00:00:00.000`) o al final del día (`23:59:59.999`).
   *
   * @param {string|Date|null|undefined} valor - Fecha de entrada a normalizar.
   * @param {boolean} finDeDia - Si es `true`, ajusta al último milisegundo del día; de lo contrario, al inicio.
   * @returns {Date|null} Instancia `Date` normalizada o `null` si el valor es vacío o inválido.
   */
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

  /**
   * Descarga el ticket PDF generado por el backend para una consulta y dispara su
   * descarga automática en el navegador mediante un enlace temporal `<a>`.
   * Consume `GET persona-rol/{idPersonaRol}/consulta/{idConsulta}/ticket`.
   *
   * @param {string|number} idPersonaRol - Identificador del `persona-rol` asociado.
   * @param {string|number} idConsulta - Identificador único de la consulta.
   * @returns {Promise<Blob>} Contenido binario (`Blob`) del documento PDF descargado.
   * @throws {DefaultError} Si faltan parámetros obligatorios, falla la conexión o el servidor devuelve error HTTP.
   */
  async descargarTicketPdf(idPersonaRol, idConsulta) {
    if (!idPersonaRol || !idConsulta) {
      const errorSalida = new DefaultError();
      errorSalida.mensaje =
        "El identificador de persona-rol y de consulta son obligatorios";
      throw errorSalida;
    }

    const url = `${this.#urlConsultas(idPersonaRol)}/${encodeURIComponent(idConsulta)}/ticket`;

    let resp;
    try {
      resp = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/pdf" },
      });
    } catch (err) {
      const errorSalida = new DefaultError();
      errorSalida.mensaje = "Error al acceder al repositorio";
      errorSalida.error = err;
      throw errorSalida;
    }

    if (!resp.ok) {
      const errorSalida = new DefaultError();
      errorSalida.mensaje = `Error al descargar el ticket PDF. Codigo: ${resp.status}`;
      errorSalida.error = resp.status;
      throw errorSalida;
    }

    const blob = await resp.blob();
    const nombreArchivo = ConsultaService.#extraerNombreArchivo(
      resp.headers.get("Content-Disposition"),
      `ticket-cita-${idConsulta}.pdf`,
    );

    const objectUrl = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = objectUrl;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

    return blob;
  }

  /**
   * Extrae el nombre de archivo (`filename`) desde el encabezado HTTP `Content-Disposition`
   * o devuelve el nombre de respaldo si no está presente.
   *
   * @param {string|null} contentDisposition - Valor crudo del encabezado `Content-Disposition`.
   * @param {string} respaldo - Nombre de archivo por defecto a utilizar si no se detecta `filename`.
   * @returns {string} Nombre de archivo limpio para la descarga.
   */
  static #extraerNombreArchivo(contentDisposition, respaldo) {
    if (!contentDisposition) return respaldo;
    const match = contentDisposition.match(/filename="?([^";]+)"?/i);
    return match?.[1] ? match[1].trim() : respaldo;
  }
}

export default ConsultaService;