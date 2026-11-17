export default class Consulta {
  constructor({
    idConsulta = null,
    fechaInicio = null,
    fechaFin = null,
    referenciaExterna = null,
    idPersonaRol = null,
    observaciones = null,
    clinica = null,
    paciente = null,
    procedimientos = [],
  } = {}) {
    this.idConsulta = idConsulta;
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin;
    this.referenciaExterna = referenciaExterna;
    this.idPersonaRol = idPersonaRol;
    this.observaciones = observaciones;
    this.clinica = clinica;
    this.paciente = paciente;
    this.procedimientos = Array.isArray(procedimientos)
      ? Object.freeze([...procedimientos])
      : Object.freeze([]);
    Object.freeze(this);
  }

  /**
   * Convención de DefaultService; delega en desdeJson.
   * @returns {Consulta|null} null si `json` es null o undefined
   */
  static fromJSON(json) {
    return Consulta.desdeJson(json);
  }

  /**
   * Copia con algunos valores cambiados (la entity es inmutable).
   * @param {object} cambios p. ej. { fechaFin: new Date() }
   * @returns {Consulta}
   */
  con(cambios) {
    return new Consulta({ ...this, ...cambios });
  }

  /** uuid de idPersonaRol, venga como objeto anidado o como uuid suelto. */
  idDePersonaRol() {
    const r = this.idPersonaRol;
    return (typeof r === "string" ? r : r?.idPersonaRol) || null;
  }

  /** Primeros 8 caracteres del uuid, para mostrar un identificador corto. */
  get idCorto() {
    return this.idConsulta ? String(this.idConsulta).slice(0, 8) : "";
  }

  /** Una consulta está pendiente mientras no tenga fecha de fin. */
  get pendiente() {
    return this.fechaFin == null;
  }

  // Procedimientos extraídos de observaciones como pares { titulo, descripcion }.
  // Procedimientos reales desde consultaProcedimientoList y/o observaciones.
  get pasos() {
    if (this.procedimientos.length > 0) {
      const items = this.procedimientos.map((cp) => ({
        titulo:
          cp?.idProcedimiento?.nombre ??
          cp?.nombreProcedimiento ??
          "Procedimiento",
        descripcion: cp?.observaciones ?? "",
      }));

      if (this.observaciones && this.observaciones.trim()) {
        items.push({
          titulo: "Indicaciones / Observaciones",
          descripcion: this.observaciones.trim(),
        });
      }
      return items;
    }

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
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    const idPersonaRolRef = this.idDePersonaRol();
    return {
      idConsulta: this.idConsulta,
      fechaInicio: Consulta.#aIso(this.fechaInicio),
      fechaFin: Consulta.#aIso(this.fechaFin),
      referenciaExterna: this.referenciaExterna,
      observaciones: this.observaciones,
      idPersonaRol: idPersonaRolRef ? { idPersonaRol: idPersonaRolRef } : null,
    };
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
      ? (personaRolObj.idPersonaRol ?? null)
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

    const procedimientos = Array.isArray(json.consultaProcedimientoList)
      ? json.consultaProcedimientoList
      : [];

    return new Consulta({
      idConsulta: json.idConsulta,
      fechaInicio: Consulta.#convertirAFecha(json.fechaInicio),
      fechaFin: Consulta.#convertirAFecha(json.fechaFin),
      referenciaExterna: json.referenciaExterna ?? null,
      idPersonaRol,
      observaciones: json.observaciones ?? json.Observaciones ?? null,
      clinica,
      paciente,
      procedimientos,
    });
  }

  /** Intenta convertir a tipo Date de fecha y devuelve null
   * si el valor falta o es inválido. */
  static #convertirAFecha(valor) {
    if (!valor) return null;
    if (valor instanceof Date)
      return Number.isNaN(valor.getTime()) ? null : valor;
    const limpia = String(valor)
      .trim()
      .replace(/\[UTC\]$/, "");
    const fecha = new Date(limpia);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  /** Date a ISO para el backend; cualquier otro valor pasa tal cual. */
  static #aIso(valor) {
    return valor instanceof Date ? valor.toISOString() : valor;
  }
}
