export default class Consulta {
  /**
   * @param {object}      datos
   * @param {string}      datos.idConsulta
   * @param {Date|null}   datos.fechaInicio
   * @param {Date|null}   datos.fechaFin
   * @param {string|null} datos.referenciaExterna
   * @param {string|null} datos.idPersonaRol
   */
  constructor({
    idConsulta,
    fechaInicio,
    fechaFin,
    referenciaExterna,
    idPersonaRol,
  }) {
    this.idConsulta = idConsulta;
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin;
    this.referenciaExterna = referenciaExterna;
    this.idPersonaRol = idPersonaRol;
    Object.freeze(this);
  }

  // Una consulta está pendiente mientras no tenga fecha de fin.
  get pendiente() {
    return this.fechaFin === null;
  }

  // Primeros 8 caracteres del UUID, para mostrar en la tarjeta.
  get idCorto() {
    return String(this.idConsulta).slice(0, 8);
  }

  /**
   * Construye una Consulta desde el JSON del servidor.
   * @param {object} json
   * @returns {Consulta}
   */
  static desdeJson(json) {
    return new Consulta({
      idConsulta: json.idConsulta,
      fechaInicio: Consulta.#convertirAFecha(json.fechaInicio),
      fechaFin: Consulta.#convertirAFecha(json.fechaFin),
      referenciaExterna: json.referenciaExterna ?? null,
      idPersonaRol: json.idPersonaRol ?? null,
    });
  }

  /** Intenta convertir a tipo Date de fecha y devuelve null
   * si el valor falta o es inválido. */
  static #convertirAFecha(valor) {
    if (!valor) return null;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }
}
