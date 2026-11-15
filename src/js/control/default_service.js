import DefaultError from "../entity/default_error.js";
import DefaultResponse from "../entity/default_response.js";

/*
 * Solo son nuevos los métodos `update` y `findAll`. create, findRange,
 * findById y delete son los mismos de la versión anterior.
 */
class DefaultService {
  constructor() {
    this._BASE_URL =
      "http://localhost:9080/GalenoSV-1.0-SNAPSHOT/resources/v1/";
    this.URL = this._BASE_URL;

    // Cada service hijo asigna aquí la clase de su entity (con fromJSON).
    // Si queda en null, findRange y findById devuelven el JSON sin convertir.
    this.EntityClass = null;
  }

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
   * NUEVO. Recorre todas las páginas de findRange y devuelve el arreglo
   * completo de registros. El backend no filtra por relación, así que es la
   * forma de obtener "las órdenes de este paso": se trae todo y se filtra en
   * el cliente. Cuesta una petición por cada `max` registros.
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
   * NUEVO. PUT a /{uuid} con la entidad completa. Se asume que el backend
   * responde 200 o 204 (aún por definir).
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
