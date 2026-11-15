/**
 * Tabla procedimiento_paso_examen: examen que puede asignarse en un paso.
 *
 * Los nombres de atributo son los que serializa el backend. Las relaciones
 * llegan como objeto anidado y se conservan así para la interfaz; al enviar,
 * toJSON las reduce a una referencia por id.
 */
export default class ProcedimientoPasoExamen {
  constructor(datos) {
    const d = datos ?? {};
    this.idProcedimientoPasoExamen = d.idProcedimientoPasoExamen ?? null;
    this.fechaCreacion = d.fechaCreacion ?? null;
    this.activo = d.activo ?? null;
    this.observaciones = d.observaciones ?? null;
    this.idProcedimientoPaso = d.idProcedimientoPaso ?? null;
    this.idExamen = d.idExamen ?? null;
  }

  /** @returns {ProcedimientoPasoExamen|null} null si `json` es null o undefined */
  static fromJSON(json) {
    return json == null ? null : new ProcedimientoPasoExamen(json);
  }

  /** uuid de idProcedimientoPaso, venga como objeto anidado o como uuid suelto. */
  idDeProcedimientoPaso() {
    const r = this.idProcedimientoPaso;
    return (typeof r === "string" ? r : r?.idProcedimientoPaso) || null;
  }

  /** uuid de idExamen, venga como objeto anidado o como uuid suelto. */
  idDeExamen() {
    const r = this.idExamen;
    return (typeof r === "string" ? r : r?.idExamen) || null;
  }

  /**
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    const idProcedimientoPasoRef = this.idDeProcedimientoPaso();
    const idExamenRef = this.idDeExamen();
    return {
      idProcedimientoPasoExamen: this.idProcedimientoPasoExamen,
      fechaCreacion: this.fechaCreacion,
      activo: this.activo,
      observaciones: this.observaciones,
      idProcedimientoPaso: idProcedimientoPasoRef
        ? { idProcedimientoPaso: idProcedimientoPasoRef }
        : null,
      idExamen: idExamenRef ? { idExamen: idExamenRef } : null,
    };
  }
}
