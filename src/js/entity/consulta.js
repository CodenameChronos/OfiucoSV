/**
 * Tabla consulta.
 *
 * Los nombres de atributo son los que serializa el backend. Las relaciones
 * llegan como objeto anidado y se conservan así para la interfaz; al enviar,
 * toJSON las reduce a una referencia por id.
 */
export default class Consulta {
  constructor(datos) {
    const d = datos ?? {};
    this.idConsulta = d.idConsulta ?? null;
    this.fechaInicio = d.fechaInicio ?? null;
    this.fechaFin = d.fechaFin ?? null;
    this.referenciaExterna = d.referenciaExterna ?? null;
    this.observaciones = d.observaciones ?? null;
    this.idPersonaRol = d.idPersonaRol ?? null;
  }

  /** @returns {Consulta|null} null si `json` es null o undefined */
  static fromJSON(json) {
    return json == null ? null : new Consulta(json);
  }

  /** uuid de idPersonaRol, venga como objeto anidado o como uuid suelto. */
  idDePersonaRol() {
    const r = this.idPersonaRol;
    return (typeof r === "string" ? r : r?.idPersonaRol) || null;
  }

  /**
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    const idPersonaRolRef = this.idDePersonaRol();
    return {
      idConsulta: this.idConsulta,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      referenciaExterna: this.referenciaExterna,
      observaciones: this.observaciones,
      idPersonaRol: idPersonaRolRef ? { idPersonaRol: idPersonaRolRef } : null,
    };
  }
}
