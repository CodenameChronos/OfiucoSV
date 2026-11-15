/**
 * Tabla orden_examen.
 * `indicaciones` guarda el uuid del procedimiento_paso_examen a realizar
 * (ver control/indicaciones_codec.js).
 *
 * Los nombres de atributo son los que serializa el backend. Las relaciones
 * llegan como objeto anidado y se conservan así para la interfaz; al enviar,
 * toJSON las reduce a una referencia por id.
 */
export default class OrdenExamen {
  constructor(datos) {
    const d = datos ?? {};
    this.idOrdenExamen = d.idOrdenExamen ?? null;
    this.fechaCreacion = d.fechaCreacion ?? null;
    this.indicaciones = d.indicaciones ?? null;
    this.idConsultaProcedimientoPaso = d.idConsultaProcedimientoPaso ?? null;
  }

  /** @returns {OrdenExamen|null} null si `json` es null o undefined */
  static fromJSON(json) {
    return json == null ? null : new OrdenExamen(json);
  }

  /** uuid de idConsultaProcedimientoPaso, venga como objeto anidado o como uuid suelto. */
  idDeConsultaProcedimientoPaso() {
    const r = this.idConsultaProcedimientoPaso;
    return (typeof r === "string" ? r : r?.idConsultaProcedimientoPaso) || null;
  }

  /**
   * Cuerpo para el backend. JSON.stringify lo llama automáticamente.
   * Los valores sin dato van como null.
   */
  toJSON() {
    const idConsultaProcedimientoPasoRef = this.idDeConsultaProcedimientoPaso();
    return {
      idOrdenExamen: this.idOrdenExamen,
      fechaCreacion: this.fechaCreacion,
      indicaciones: this.indicaciones,
      idConsultaProcedimientoPaso: idConsultaProcedimientoPasoRef
        ? { idConsultaProcedimientoPaso: idConsultaProcedimientoPasoRef }
        : null,
    };
  }
}
