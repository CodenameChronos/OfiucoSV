/**
 * @fileoverview Clase base de servicios REST del sistema GalenoSV (`DefaultService`).
 * Estandariza las operaciones HTTP (`create`, `findRange`, `findAll`, `findById`, `update`, `delete`),
 * la deserialización opcional mediante `EntityClass.fromJSON` y el encapsulamiento uniforme
 * de errores de red o respuestas HTTP en instancias de `DefaultError`
 */

import DefaultError from "../entity/default_error.js";
import DefaultResponse from "../entity/default_response.js";

/*
 * Solo son nuevos los métodos `update` y `findAll`. create, findRange,
 * findById y delete son los mismos de la versión anterior.
 */
class DefaultService {
  /**
   * Inicializa la URL base del servidor REST de GalenoSV y establece
   * `EntityClass` en `null` por defecto
   */
  constructor() {
    this._BASE_URL = "http://localhost:9080/galeno/resources/v1/";
    this.URL = this._BASE_URL;
    this.EntityClass = null;
  }

  /**
   * Envía una petición `POST` para crear un nuevo registro en `this.URL` y extrae
   * el identificador generado desde el último segmento del encabezado `Location` (HTTP 201)
   *
   * @param {Object} entidad - Objeto o entidad serializable a JSON a persistir
   * @returns {Promise<string>} Identificador del nuevo recurso extraído de `Location`
   * @throws {DefaultError} Si el servidor responde con un estado distinto de 201 o falla la conexión
   */
  create(entidad) {
    let errorSalida = new DefaultError();
    let salida = new Promise((exito, rechazo) => {
      fetch(this.URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entidad),
      })
        .then((resp) => {
          if (resp.status === 201) {
            exito(resp.headers.get("Location").split("/").pop());
          } else {
            errorSalida.mensaje = `Error al crear el registro. Codigo: ${resp.status}`;
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
    return salida;
  }

  /**
   * Obtiene una página de registros mediante `GET` enviando los parámetros de paginación
   * (`first`, `primero` y `max`), deserializa cada elemento con `EntityClass.fromJSON` si está
   * definida y extrae `Total-registros` de los encabezados HTTP
   *
   * @param {number} first - Índice inicial (base 0) del primer registro a recuperar
   * @param {number} max - Cantidad máxima de registros solicitados en la página
   * @returns {Promise<DefaultResponse>} Objeto con `registros` y `totalRegistros` (`number|null`)
   * @throws {DefaultError} Si el servidor responde con error HTTP, falla el parseo JSON o hay error de red
   */
  findRange(first, max) {
    let errorSalida = new DefaultError();
    let salida = new Promise((exito, rechazo) => {
      // Los resources no usan el mismo nombre para el desplazamiento: unos leen
      // `first` y otros `primero`. Se envían ambos; JAX-RS ignora el que el
      // resource no declara. Quitar uno cuando el backend se unifique.
      fetch(`${this.URL}?first=${first}&primero=${first}&max=${max}`, {
        method: "GET",
      })
        .then((resp) => {
          if (resp.status === 200) {
            resp
              .json()
              .then((j) => {
                let datos = new DefaultResponse();
                datos.registros = this.EntityClass
                  ? j.map((x) => this.EntityClass.fromJSON(x))
                  : j;
                // Número entero; null si el header falta o no es numérico (total desconocido)
                const total = Number.parseInt(
                  resp.headers.get("Total-registros"),
                  10,
                );
                datos.totalRegistros = Number.isNaN(total) ? null : total;
                exito(datos);
              })
              .catch((e) => {
                errorSalida.mensaje = "Error al procesar respuesta";
                errorSalida.error = e;
                rechazo(errorSalida);
              });
          } else {
            errorSalida.mensaje = `Error al obtener datos. Codigo: ${resp.status}`;
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
    return salida;
  }

  /**
   * NUEVO. Recorre todas las páginas de `findRange` y devuelve el arreglo
   * completo de registros. El backend no filtra por relación, así que es la
   * forma de obtener "las órdenes de este paso": se trae todo y se filtra en
   * el cliente. Cuesta una petición por cada `max` registros
   *
   * @param {number} [max=50] - Tamaño de lote utilizado en cada llamada sucesiva a `findRange`
   * @returns {Promise<Array<*>>} Arreglo acumulado con todos los registros disponibles del recurso
   */
  findAll(max = 50) {
    return new Promise((exito, rechazo) => {
      const acumulado = [];
      const pedir = (first) => {
        this.findRange(first, max)
          .then((resp) => {
            acumulado.push(...resp.registros);
            const total = Number(resp.totalRegistros);
            const hayMas =
              resp.registros.length > 0 &&
              (resp.totalRegistros != null && Number.isFinite(total)
                ? acumulado.length < total
                : resp.registros.length === max);
            if (hayMas) {
              pedir(first + max);
            } else {
              exito(acumulado);
            }
          })
          .catch(rechazo);
      };
      pedir(0);
    });
  }

  /**
   * Recupera un registro individual por su identificador (`uuid`) mediante `GET {this.URL}/{uuid}`
   * y lo convierte con `EntityClass.fromJSON` si está configurada
   *
   * @param {string|number} uuid - Identificador único del recurso a consultar
   * @returns {Promise<*>} Entidad deserializada o el objeto JSON crudo si `EntityClass` es `null`
   * @throws {DefaultError} Si el estado HTTP no es 200, falla el parseo JSON o ocurre un error de red
   */
  findById(uuid) {
    let errorSalida = new DefaultError();
    let salida = new Promise((exito, rechazo) => {
      fetch(`${this.URL}/${uuid}`, { method: "GET" })
        .then((resp) => {
          if (resp.status === 200) {
            resp
              .json()
              .then((j) =>
                exito(this.EntityClass ? this.EntityClass.fromJSON(j) : j),
              )
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
    return salida;
  }

  /**
   * NUEVO. `PUT` a `/{uuid}` con la entidad completa. Se asume que el backend
   * responde 200 o 204 (aún por definir)[cite: 17]. Si devuelve 409 (conflicto),
   * propaga el cuerpo textual de la respuesta en `DefaultError.mensaje`
   *
   * @param {string|number} uuid - Identificador único del recurso a actualizar
   * @param {Object} entidad - Representación completa de la entidad a enviar en el cuerpo JSON
   * @returns {Promise<boolean>} `true` cuando la actualización concluye con estado 200 o 204
   * @throws {DefaultError} Si ocurre un conflicto (409), otro error HTTP o fallo de red
   */
  update(uuid, entidad) {
    let errorSalida = new DefaultError();
    let salida = new Promise((exito, rechazo) => {
      fetch(`${this.URL}/${uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entidad),
      })
        .then((resp) => {
          if (resp.status === 200 || resp.status === 204) {
            exito(true);
          } else if (resp.status === 409) {
            resp
              .text()
              .then((t) => {
                errorSalida.mensaje = t;
                errorSalida.error = resp.status;
                rechazo(errorSalida);
              })
              .catch((e) => {
                errorSalida.mensaje = "Error al procesar respuesta";
                errorSalida.error = e;
                rechazo(errorSalida);
              });
          } else {
            errorSalida.mensaje = `Error al actualizar el registro. Codigo: ${resp.status}`;
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
    return salida;
  }

  /**
   * Elimina un registro existente mediante `DELETE {this.URL}/{uuid}`
   * Resuelve con `true` ante HTTP 204 y propaga el mensaje del servidor ante conflictos HTTP 409
   *
   * @param {string|number} uuid - Identificador único del recurso a eliminar
   * @returns {Promise<boolean>} `true` si el recurso fue eliminado exitosamente (HTTP 204)
   * @throws {DefaultError} Si hay conflicto de integridad (409), error HTTP o fallo de conexión
   */
  delete(uuid) {
    let errorSalida = new DefaultError();
    let salida = new Promise((exito, rechazo) => {
      fetch(`${this.URL}/${uuid}`, { method: "DELETE" })
        .then((resp) => {
          if (resp.status === 204) {
            exito(true);
          } else if (resp.status === 409) {
            resp
              .text()
              .then((t) => {
                errorSalida.mensaje = t;
                errorSalida.error = resp.status;
                rechazo(errorSalida);
              })
              .catch((e) => {
                errorSalida.mensaje = "Error al procesar respuesta";
                errorSalida.error = e;
                rechazo(errorSalida);
              });
          } else {
            errorSalida.mensaje = `Error al eliminar el registro. Codigo: ${resp.status}`;
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
    return salida;
  }
}
export default DefaultService;
