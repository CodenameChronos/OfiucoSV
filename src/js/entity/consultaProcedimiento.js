/**
 * Tabla consulta_procedimiento: procedimiento que se sigue en una consulta.
 *
 * Los nombres de atributo son los que serializa el backend. Las relaciones
 * llegan como objeto anidado y se conservan así para la interfaz; al enviar,
 * toJSON las reduce a una referencia por id.
 */
export default class ConsultaProcedimiento {
  constructor(datos) {
    const d = datos ?? {};
    this.idConsultaProcedimiento = d.idConsultaProcedimiento ?? null;
    this.fechaInicio = d.fechaInicio ?? null;
    this.fechaFin = d.fechaFin ?? null;
    this.observaciones = d.observaciones ?? null;
    this.idConsulta = d.idConsulta ?? null;
    this.idProcedimiento = d.idProcedimiento ?? null;
  }

  /** @returns {ConsultaProcedimiento|null} null si `json` es null o undefined */
  static fromJSON(json) {
    return json == null ? null : new ConsultaProcedimiento(json);
  }

  /** uuid de idConsulta, venga como objeto anidado o como uuid suelto. */
  idDeConsulta() {
    const r = this.idConsulta;
    return (typeof r === "string" ? r : r?.idConsulta) || null;
  }

  /** uuid de idProcedimiento, venga como objeto anidado o como uuid suelto. */
  idDeProcedimiento() {
    const r = this.idProcedimiento;
    return (typeof r === "string" ? r : r?.idProcedimiento) || null;
  }

  /**
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    const idConsultaRef = this.idDeConsulta();
    const idProcedimientoRef = this.idDeProcedimiento();
    return {
      idConsultaProcedimiento: this.idConsultaProcedimiento,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      observaciones: this.observaciones,
      idConsulta: idConsultaRef ? { idConsulta: idConsultaRef } : null,
      idProcedimiento: idProcedimientoRef
        ? { idProcedimiento: idProcedimientoRef }
        : null,
    };
  }
}
