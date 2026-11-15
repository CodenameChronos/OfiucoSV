/**
 * Tabla procedimiento.
 *
 * Los nombres de atributo son los que serializa el backend.
 */
export default class Procedimiento {
  constructor(datos) {
    const d = datos ?? {};
    this.idProcedimiento = d.idProcedimiento ?? null;
    this.nombre = d.nombre ?? null;
    this.activo = d.activo ?? null;
    this.observaciones = d.observaciones ?? null;
  }

  /** @returns {Procedimiento|null} null si `json` es null o undefined */
  static fromJSON(json) {
    return json == null ? null : new Procedimiento(json);
  }

  /**
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    return {
      idProcedimiento: this.idProcedimiento,
      nombre: this.nombre,
      activo: this.activo,
      observaciones: this.observaciones,
    };
  }
}
