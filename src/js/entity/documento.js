export default class Documento {
  constructor(data = {}) {
    Object.assign(this,
      {
        idDocumento: null, valor: '', rutaFisica: null, idPersona: null, idTipoDocumento: null
      }, data);
  }
  
  static fromJSON(data) {
    return data == null ? null : new Documento(data);
  }

  tipoId() {
    return typeof this.idTipoDocumento === 'string' ? this.idTipoDocumento : this.idTipoDocumento?.idTipoDocumento ?? null;
  }
}
