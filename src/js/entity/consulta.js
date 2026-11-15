export default class Consulta {
  /**
   * @param {object}      datos
   * @param {string}      datos.idConsulta
   * @param {Date|null}   datos.fechaInicio
   * @param {Date|null}   datos.fechaFin
   * @param {string|null} datos.referenciaExterna
   * @param {string|null} datos.idPersonaRol
   * @param {string|null} [datos.observaciones]
   * @param {object|null} [datos.clinica]
   * @param {object|null} [datos.paciente]
   */
  constructor({
    idConsulta,
    fechaInicio,
    fechaFin,
    referenciaExterna,
    idPersonaRol,
    observaciones = null,
    clinica = null,
    paciente = null,
  }) {
    this.idConsulta = idConsulta;
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin;
    this.referenciaExterna = referenciaExterna;
    this.idPersonaRol = idPersonaRol;
    this.observaciones = observaciones;
    this.clinica = clinica;
    this.paciente = paciente;
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

  // Procedimientos extraídos de observaciones como pares { titulo, descripcion }.
  get pasos() {
    return Consulta.parsearObservaciones(this.observaciones);
  }

  /**
   * Parsea el texto plano del campo Observaciones en una lista de pasos
   * con estructura { titulo, descripcion }.
   * @param {string|null|undefined} texto
   * @returns {Array<{titulo: string, descripcion: string}>}
   */
  static parsearObservaciones(texto) {
    if (!texto || typeof texto !== "string") return [];

    const lineas = texto
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter((linea) => linea.length > 0);

    const pasos = [];
    for (let i = 0; i < lineas.length; i += 2) {
      pasos.push({
        titulo: lineas[i],
        descripcion: lineas[i + 1] ?? "",
      });
    }
    return pasos;
  }

  /**
   * Construye una Consulta desde el JSON del servidor.
   * @param {object} json
   * @returns {Consulta|null}
   */
  static desdeJson(json) {
    if (!json) return null;

    const personaRolObj =
      json.idPersonaRol && typeof json.idPersonaRol === "object"
        ? json.idPersonaRol
        : null;

    const idPersonaRol = personaRolObj
      ? personaRolObj.idPersonaRol ?? null
      : (json.idPersonaRol ?? null);

    const clinica =
      json.clinica ??
      personaRolObj?.idClinica ??
      personaRolObj?.clinica ??
      null;

    const paciente =
      json.paciente ??
      personaRolObj?.idPersona ??
      personaRolObj?.persona ??
      null;

    return new Consulta({
      idConsulta: json.idConsulta,
      fechaInicio: Consulta.#convertirAFecha(json.fechaInicio),
      fechaFin: Consulta.#convertirAFecha(json.fechaFin),
      referenciaExterna: json.referenciaExterna ?? null,
      idPersonaRol,
      observaciones: json.observaciones ?? json.Observaciones ?? null,
      clinica,
      paciente,
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