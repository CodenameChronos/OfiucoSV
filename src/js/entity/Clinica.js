class Clinica {
  constructor({ idClinica = null, nombreClinica = "", activo = true } = {}) {
    this.idClinica = idClinica;
    this.nombreClinica = nombreClinica;
    this.activo = activo;
  }

  static desdeJson(json) {
    if (!json) return null;
    return new Clinica({
      idClinica: json.idClinica ?? null,
      nombreClinica: json.nombreClinica ?? json.nombre ?? "",
      activo: json.activo ?? true,
    });
  }
}

export default Clinica;