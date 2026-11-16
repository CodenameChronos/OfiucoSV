/**
 * Modelo de consulta_procedimiento_paso.
 * Representa un paso realizado dentro de un procedimiento de una consulta.
 */
export default class ConsultaProcedimientoPaso {
  constructor(datos = {}) {
    this.idConsultaProcedimientoPaso = datos.idConsultaProcedimientoPaso ?? null;
    this.fechaInicio = datos.fechaInicio ?? null;
    this.fechaFin = datos.fechaFin ?? null;
    this.estado = datos.estado ?? null;
    this.idConsultaProcedimiento = datos.idConsultaProcedimiento ?? null;
    this.idProcedimientoPaso = datos.idProcedimientoPaso ?? null;
    this.idPersonaRol = datos.idPersonaRol ?? null;
    this.ordenExamenList = datos.ordenExamenList ?? [];
  }

  static fromJSON(json) {
    return json == null ? null : new ConsultaProcedimientoPaso(json);
  }

  idDeConsultaProcedimiento() {
    const relacion = this.idConsultaProcedimiento;
    return (typeof relacion === "string" ? relacion : relacion?.idConsultaProcedimiento) ?? null;
  }

  toJSON() {
    const idConsultaProcedimiento = this.idDeConsultaProcedimiento();
    return {
      idConsultaProcedimientoPaso: this.idConsultaProcedimientoPaso,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      estado: this.estado,
      idConsultaProcedimiento: idConsultaProcedimiento
        ? { idConsultaProcedimiento }
        : null,
      idProcedimientoPaso: this.idProcedimientoPaso,
      idPersonaRol: this.idPersonaRol,
      ordenExamenList: this.ordenExamenList,
    };
  }
}
