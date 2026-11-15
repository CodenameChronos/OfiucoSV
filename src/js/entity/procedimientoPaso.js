/**
 * Tabla procedimiento_paso.
 *
 * Los nombres de atributo son los que serializa el backend. Las relaciones
 * llegan como objeto anidado y se conservan así para la interfaz; al enviar,
 * toJSON las reduce a una referencia por id.
 */
export default class ProcedimientoPaso {
  constructor(datos) {
    const d = datos ?? {};
    this.idProcedimientoPaso = d.idProcedimientoPaso ?? null;
    this.nombre = d.nombre ?? null;
    this.indicaFin = d.indicaFin ?? null;
    this.idProcedimiento = d.idProcedimiento ?? null;
    this.idRol = d.idRol ?? null;
  }

  /** @returns {ProcedimientoPaso|null} null si `json` es null o undefined */
  static fromJSON(json) {
    return json == null ? null : new ProcedimientoPaso(json);
  }

  /** uuid de idProcedimiento, venga como objeto anidado o como uuid suelto. */
  idDeProcedimiento() {
    const r = this.idProcedimiento;
    return (typeof r === "string" ? r : r?.idProcedimiento) || null;
  }

  /** uuid de idRol, venga como objeto anidado o como uuid suelto. */
  idDeRol() {
    const r = this.idRol;
    return (typeof r === "string" ? r : r?.idRol) || null;
  }

  /**
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    const idProcedimientoRef = this.idDeProcedimiento();
    const idRolRef = this.idDeRol();
    return {
      idProcedimientoPaso: this.idProcedimientoPaso,
      nombre: this.nombre,
      indicaFin: this.indicaFin,
      idProcedimiento: idProcedimientoRef
        ? { idProcedimiento: idProcedimientoRef }
        : null,
      idRol: idRolRef ? { idRol: idRolRef } : null,
    };
  }
}
