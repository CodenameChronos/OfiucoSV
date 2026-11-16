import { expect } from "chai";
import ConsultaProcedimientoPaso from "../../src/js/entity/consultaProcedimientoPaso.js";

describe("entity ConsultaProcedimientoPaso", () => {
  it("sin datos deja los campos en null y la lista de órdenes vacía", () => {
    const paso = new ConsultaProcedimientoPaso();

    expect(paso.estado).to.equal(null);
    expect(paso.idConsultaProcedimientoPaso).to.equal(null);
    expect(paso.ordenExamenList).to.deep.equal([]);
  });

  it("cada instancia tiene su propia lista de órdenes", () => {
    const uno = new ConsultaProcedimientoPaso();
    const dos = new ConsultaProcedimientoPaso();

    uno.ordenExamenList.push("x");

    expect(dos.ordenExamenList).to.deep.equal([]);
  });

  it("fromJSON devuelve null para null y undefined, e instancia en otro caso", () => {
    expect(ConsultaProcedimientoPaso.fromJSON(null)).to.equal(null);
    expect(ConsultaProcedimientoPaso.fromJSON(undefined)).to.equal(null);
    expect(ConsultaProcedimientoPaso.fromJSON({ estado: "En curso" }).estado).to.equal("En curso");
  });

  describe("idDeConsultaProcedimiento", () => {
    it("acepta uuid suelto y objeto anidado", () => {
      expect(new ConsultaProcedimientoPaso({ idConsultaProcedimiento: "cp-1" }).idDeConsultaProcedimiento()).to.equal("cp-1");
      expect(new ConsultaProcedimientoPaso({ idConsultaProcedimiento: { idConsultaProcedimiento: "cp-2" } }).idDeConsultaProcedimiento()).to.equal("cp-2");
    });

    it("devuelve null sin relación", () => {
      expect(new ConsultaProcedimientoPaso().idDeConsultaProcedimiento()).to.equal(null);
    });
  });

  describe("toJSON", () => {
    it("reduce idConsultaProcedimiento a una referencia por id", () => {
      const json = new ConsultaProcedimientoPaso({
        idConsultaProcedimiento: { idConsultaProcedimiento: "cp-1", otro: 1 },
      }).toJSON();

      expect(json.idConsultaProcedimiento).to.deep.equal({ idConsultaProcedimiento: "cp-1" });
    });

    it("sin relación envía null", () => {
      expect(new ConsultaProcedimientoPaso().toJSON().idConsultaProcedimiento).to.equal(null);
    });

    it("conserva estado y fechas", () => {
      const json = new ConsultaProcedimientoPaso({
        estado: "Finalizado",
        fechaInicio: "2026-01-01T10:00:00Z",
        fechaFin: "2026-01-01T11:00:00Z",
      }).toJSON();

      expect(json).to.deep.include({
        estado: "Finalizado",
        fechaInicio: "2026-01-01T10:00:00Z",
        fechaFin: "2026-01-01T11:00:00Z",
      });
    });
  });

  // El AtencionService crea y actualiza filas con ids sueltos (strings) y el
  // backend (Jakarta EE) espera entidades anidadas: ver
  // ConsultaProcedimientoPasoResource, que lee getIdPersonaRol().getIdPersonaRol().
  describe("contrato que usa el AtencionService", () => {
    it("expone idDeProcedimientoPaso() (el loader lo invoca en cada fila)", () => {
      expect(new ConsultaProcedimientoPaso({ idProcedimientoPaso: "pp-1" }).idDeProcedimientoPaso).to.be.a("function");
    });

    it("idDeProcedimientoPaso() acepta uuid suelto, objeto anidado y ausencia", () => {
      const de = (v) => new ConsultaProcedimientoPaso({ idProcedimientoPaso: v }).idDeProcedimientoPaso();

      expect(de("pp-1")).to.equal("pp-1");
      expect(de({ idProcedimientoPaso: "pp-2", nombre: "x" })).to.equal("pp-2");
      expect(de(null)).to.equal(null);
    });

    it("idDePersonaRol() acepta uuid suelto, objeto anidado y ausencia", () => {
      const de = (v) => new ConsultaProcedimientoPaso({ idPersonaRol: v }).idDePersonaRol();

      expect(de("pr-1")).to.equal("pr-1");
      expect(de({ idPersonaRol: "pr-2" })).to.equal("pr-2");
      expect(de(null)).to.equal(null);
    });

    it("toJSON envía idProcedimientoPaso como referencia por id, también si era un uuid suelto", () => {
      const suelto = new ConsultaProcedimientoPaso({ idProcedimientoPaso: "pp-1" }).toJSON();
      const anidado = new ConsultaProcedimientoPaso({ idProcedimientoPaso: { idProcedimientoPaso: "pp-1", nombre: "x" } }).toJSON();

      expect(suelto.idProcedimientoPaso).to.deep.equal({ idProcedimientoPaso: "pp-1" });
      expect(anidado.idProcedimientoPaso).to.deep.equal({ idProcedimientoPaso: "pp-1" });
    });

    it("toJSON envía idPersonaRol como referencia por id, también si era un uuid suelto", () => {
      const suelto = new ConsultaProcedimientoPaso({ idPersonaRol: "pr-1" }).toJSON();
      const anidado = new ConsultaProcedimientoPaso({ idPersonaRol: { idPersonaRol: "pr-1", idRol: {} } }).toJSON();

      expect(suelto.idPersonaRol).to.deep.equal({ idPersonaRol: "pr-1" });
      expect(anidado.idPersonaRol).to.deep.equal({ idPersonaRol: "pr-1" });
    });

    it("toJSON envía null si no hay procedimiento paso ni persona rol", () => {
      const json = new ConsultaProcedimientoPaso().toJSON();

      expect(json.idProcedimientoPaso).to.equal(null);
      expect(json.idPersonaRol).to.equal(null);
    });
  });
});
