/**
 * Tabla persona.
 *
 * Los nombres de atributo son los que serializa el backend. Las relaciones
 * llegan como objeto anidado y se conservan así para la interfaz; al enviar,
 * toJSON las reduce a una referencia por id.
 */
export default class Persona {
  constructor(datos) {
    const d = datos ?? {};
    this.idPersona = d.idPersona ?? null;
    this.nombres = d.nombres ?? null;
    this.apellidos = d.apellidos ?? null;
    this.fechaNacimiento = d.fechaNacimiento ?? null;
    this.fechaCreacion = d.fechaCreacion ?? null;
  }

  /** @returns {Persona|null} null si `json` es null o undefined */
  static fromJSON(json) {
    return json == null ? null : new Persona(json);
  }

  /**
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    return {
      idPersona: this.idPersona,
      nombres: this.nombres,
      apellidos: this.apellidos,
      fechaNacimiento: this.fechaNacimiento,
      fechaCreacion: this.fechaCreacion,
    };
  }
}
