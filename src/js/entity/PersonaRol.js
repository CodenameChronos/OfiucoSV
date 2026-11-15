/**
 * Tabla persona_rol: rol de una persona en una clínica.
 *
 * Los nombres de atributo son los que serializa el backend. Las relaciones
 * llegan como objeto anidado y se conservan así para la interfaz; al enviar,
 * toJSON las reduce a una referencia por id.
 */
export default class PersonaRol {
  constructor(datos) {
    const d = datos ?? {};
    this.idPersonaRol = d.idPersonaRol ?? null;
    this.fechaCreacion = d.fechaCreacion ?? null;
    this.idPersona = d.idPersona ?? null;
    this.idRol = d.idRol ?? null;
    this.idClinica = d.idClinica ?? null;
  }

  /** @returns {PersonaRol|null} null si `json` es null o undefined */
  static fromJSON(json) {
    return json == null ? null : new PersonaRol(json);
  }

  /** uuid de idPersona, venga como objeto anidado o como uuid suelto. */
  idDePersona() {
    const r = this.idPersona;
    return (typeof r === "string" ? r : r?.idPersona) || null;
  }

  /** uuid de idRol, venga como objeto anidado o como uuid suelto. */
  idDeRol() {
    const r = this.idRol;
    return (typeof r === "string" ? r : r?.idRol) || null;
  }

  /** uuid de idClinica, venga como objeto anidado o como uuid suelto. */
  idDeClinica() {
    const r = this.idClinica;
    return (typeof r === "string" ? r : r?.idClinica) || null;
  }

  /**
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    const idPersonaRef = this.idDePersona();
    const idRolRef = this.idDeRol();
    const idClinicaRef = this.idDeClinica();
    return {
      idPersonaRol: this.idPersonaRol,
      fechaCreacion: this.fechaCreacion,
      idPersona: idPersonaRef ? { idPersona: idPersonaRef } : null,
      idRol: idRolRef ? { idRol: idRolRef } : null,
      idClinica: idClinicaRef ? { idClinica: idClinicaRef } : null,
    };
  }
}
