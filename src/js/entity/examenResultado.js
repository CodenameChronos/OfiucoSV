/**
 * Tabla examen_resultado: resultado técnico e interpretación para el paciente.
 *
 * Los nombres de atributo son los que serializa el backend. Las relaciones
 * llegan como objeto anidado y se conservan así para la interfaz; al enviar,
 * toJSON las reduce a una referencia por id.
 */
export default class ExamenResultado {
  constructor(datos) {
    const d = datos ?? {};
    this.idExamenResultado = d.idExamenResultado ?? null;
    this.fechaCreacion = d.fechaCreacion ?? null;
    this.resultado = d.resultado ?? null;
    this.interpretacion = d.interpretacion ?? null;
    this.rutaAtestado = d.rutaAtestado ?? null;
    this.idOrdenExamen = d.idOrdenExamen ?? null;
  }

  /** @returns {ExamenResultado|null} null si `json` es null o undefined */
  static fromJSON(json) {
    return json == null ? null : new ExamenResultado(json);
  }

  /** uuid de idOrdenExamen, venga como objeto anidado o como uuid suelto. */
  idDeOrdenExamen() {
    const r = this.idOrdenExamen;
    return (typeof r === "string" ? r : r?.idOrdenExamen) || null;
  }

  /**
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    const idOrdenExamenRef = this.idDeOrdenExamen();
    return {
      idExamenResultado: this.idExamenResultado,
      fechaCreacion: this.fechaCreacion,
      resultado: this.resultado,
      interpretacion: this.interpretacion,
      rutaAtestado: this.rutaAtestado,
      idOrdenExamen: idOrdenExamenRef
        ? { idOrdenExamen: idOrdenExamenRef }
        : null,
    };
  }
}
