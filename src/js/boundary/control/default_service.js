import DefaultError from "../entity/default_error";
import DefaultResponse from "../entity/default_response";

class DefaultService {
  constructor() {
    // Toda variable que empiece con guion bajo (como esta de abajo)
    // no debe de ser modificada en sus implementaciones, es lo
    // equivalente a una variable privada
    this._BASE_URL =
      "http://localhost:9080/GalenoSV-1.0-SNAPSHOT/resources/v1/";

    // Esta si puede modificarse y es a la que se le concatenara la
    // url del endpoint de la api a implementar
    this.URL = this._BASE_URL;
  }

  create(entity) {
    let errorSalida = new DefaultError();
    let salida = new Promise((exito, rechazo) => {
      fetch(this.URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entidad),
      })
        .then((resp) => {
          if (resp.status === 201) {
            // get("Location") recoge la url devuelta por el 201 del endpoint rest.
            // split("/") separa cada seccion dividida por / en casillas de un array.
            // ,pop() elimina el ultimo valor (irrelevante) y devuelve su valor, en este
            // caso, el uuid del registro creado
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
      // La ruta API del recurso a acceder y los parametros necesarios
      fetch(`${this.URL}?first=${first}&max=${max}`, { method: "GET" })
        .then((resp) => {
          // El tripe igual compara el valor y el tipo de dato.
          // En este caso, la respuesta debe de ser 200 y tambien un int
          if (resp.status === 200) {
            resp
              .json()
              .then((j) => {
                let datos = new DefaultResponse();
                datos.registros = j;
                datos.totalRegistros = resp.headers.get("Total-registros");
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

  findById(uuid) {
    let errorSalida = new DefaultError();
    let salida = new Promise((exito, rechazo) => {
      fetch(`${this.URL}/${uuid}`, { method: "GET" })
        .then((resp) => {
          if (resp.status === 200) {
            resp
              .json()
              .then((j) => exito(j))
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

  delete(uuid) {
    let errorSalida = new DefaultError();
    let salida = new Promise((exito, rechazo) => {
      fetch(`${this.URL}/${uuid}`, { method: "DELETE" })
        .then((resp) => {
          if (resp.status === 204) {
            exito(true);
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
