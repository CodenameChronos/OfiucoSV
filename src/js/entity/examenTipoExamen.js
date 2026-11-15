/**
 * Tabla examen_tipo_examen: categorías de un examen.
 *
 * Los nombres de atributo son los que serializa el backend. Las relaciones
 * llegan como objeto anidado y se conservan así para la interfaz; al enviar,
 * toJSON las reduce a una referencia por id.
 */
export default class ExamenTipoExamen {
  constructor(datos) {
    const d = datos ?? {};
    this.idExamenTipoExamen = d.idExamenTipoExamen ?? null;
    this.fechaCreacion = d.fechaCreacion ?? null;
    this.observaciones = d.observaciones ?? null;
    this.idExamen = d.idExamen ?? null;
    this.idTipoExamen = d.idTipoExamen ?? null;
  }

  /** @returns {ExamenTipoExamen|null} null si `json` es null o undefined */
  static fromJSON(json) {
    return json == null ? null : new ExamenTipoExamen(json);
  }

  /** uuid de idExamen, venga como objeto anidado o como uuid suelto. */
  idDeExamen() {
    const r = this.idExamen;
    return (typeof r === "string" ? r : r?.idExamen) || null;
  }

  /** uuid de idTipoExamen, venga como objeto anidado o como uuid suelto. */
  idDeTipoExamen() {
    const r = this.idTipoExamen;
    return (typeof r === "string" ? r : r?.idTipoExamen) || null;
  }

  /**
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    const idExamenRef = this.idDeExamen();
    const idTipoExamenRef = this.idDeTipoExamen();
    return {
      idExamenTipoExamen: this.idExamenTipoExamen,
      fechaCreacion: this.fechaCreacion,
      observaciones: this.observaciones,
      idExamen: idExamenRef ? { idExamen: idExamenRef } : null,
      idTipoExamen: idTipoExamenRef ? { idTipoExamen: idTipoExamenRef } : null,
    };
  }
}
