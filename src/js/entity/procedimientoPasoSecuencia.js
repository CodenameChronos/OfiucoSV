/**
 * Tabla procedimiento_paso_secuencia.
 * idProcedimientoPasoReferencia es el paso anterior; ambas relaciones apuntan a procedimiento_paso.
 *
 * Los nombres de atributo son los que serializa el backend. Las relaciones
 * llegan como objeto anidado y se conservan así para la interfaz; al enviar,
 * toJSON las reduce a una referencia por id.
 */
export default class ProcedimientoPasoSecuencia {
  constructor(datos) {
    const d = datos ?? {};
    this.idProcedimientoPasoSecuencia = d.idProcedimientoPasoSecuencia ?? null;
    this.tipoSecuencia = d.tipoSecuencia ?? null;
    this.idProcedimientoPaso = d.idProcedimientoPaso ?? null;
    this.idProcedimientoPasoReferencia =
      d.idProcedimientoPasoReferencia ?? null;
  }

  /** @returns {ProcedimientoPasoSecuencia|null} null si `json` es null o undefined */
  static fromJSON(json) {
    return json == null ? null : new ProcedimientoPasoSecuencia(json);
  }

  /** uuid de idProcedimientoPaso, venga como objeto anidado o como uuid suelto. */
  idDeProcedimientoPaso() {
    const r = this.idProcedimientoPaso;
    return (typeof r === "string" ? r : r?.idProcedimientoPaso) || null;
  }

  /** uuid de idProcedimientoPasoReferencia, venga como objeto anidado o como uuid suelto. */
  idDeProcedimientoPasoReferencia() {
    const r = this.idProcedimientoPasoReferencia;
    return (typeof r === "string" ? r : r?.idProcedimientoPaso) || null;
  }

  /**
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    const idProcedimientoPasoRef = this.idDeProcedimientoPaso();
    const idProcedimientoPasoReferenciaRef =
      this.idDeProcedimientoPasoReferencia();
    return {
      idProcedimientoPasoSecuencia: this.idProcedimientoPasoSecuencia,
      tipoSecuencia: this.tipoSecuencia,
      idProcedimientoPaso: idProcedimientoPasoRef
        ? { idProcedimientoPaso: idProcedimientoPasoRef }
        : null,
      idProcedimientoPasoReferencia: idProcedimientoPasoReferenciaRef
        ? { idProcedimientoPaso: idProcedimientoPasoReferenciaRef }
        : null,
    };
  }
}
