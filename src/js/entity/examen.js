/**
 * Tabla examen.
 *
 * Los nombres de atributo son los que serializa el backend. Las relaciones
 * llegan como objeto anidado y se conservan así para la interfaz; al enviar,
 * toJSON las reduce a una referencia por id.
 */
export default class Examen {
  constructor(datos) {
    const d = datos ?? {};
    this.idExamen = d.idExamen ?? null;
    this.nombre = d.nombre ?? null;
    this.activo = d.activo ?? null;
    this.observaciones = d.observaciones ?? null;
  }

  /** @returns {Examen|null} null si `json` es null o undefined */
  static fromJSON(json) {
    return json == null ? null : new Examen(json);
  }

  /**
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    return {
      idExamen: this.idExamen,
      nombre: this.nombre,
      activo: this.activo,
      observaciones: this.observaciones,
    };
  }
}
