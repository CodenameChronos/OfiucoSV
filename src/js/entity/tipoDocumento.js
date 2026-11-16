export default class TipoDocumento {
  constructor(data = {}) {
    Object.assign(this,
      { idTipoDocumento: null, nombre: '', descripcion: '', activo: true }
      , data);
  }

  static fromJSON(data) { return data == null ? null : new TipoDocumento(data); }
}
