import { expect } from "chai";
import OrdenExamen from "../../src/js/entity/ordenExamen.js";

describe("entity OrdenExamen", () => {
  it("sin datos deja todos los campos en null", () => {
    expect({ ...new OrdenExamen() }).to.deep.equal({
      idOrdenExamen: null,
      fechaCreacion: null,
      indicaciones: null,
      idConsultaProcedimientoPaso: null,
    });
  });

  it("copia los datos recibidos", () => {
    const orden = new OrdenExamen({ idOrdenExamen: "o1", indicaciones: "x", fechaCreacion: "2026-01-01" });

    expect(orden.idOrdenExamen).to.equal("o1");
    expect(orden.indicaciones).to.equal("x");
    expect(orden.fechaCreacion).to.equal("2026-01-01");
  });

  it("fromJSON devuelve null para null y undefined", () => {
    expect(OrdenExamen.fromJSON(null)).to.equal(null);
    expect(OrdenExamen.fromJSON(undefined)).to.equal(null);
  });

  it("fromJSON crea una instancia", () => {
    expect(OrdenExamen.fromJSON({ idOrdenExamen: "o1" })).to.be.instanceOf(OrdenExamen);
  });

  describe("idDeConsultaProcedimientoPaso", () => {
    it("acepta un uuid suelto", () => {
      expect(new OrdenExamen({ idConsultaProcedimientoPaso: "cpp-1" }).idDeConsultaProcedimientoPaso()).to.equal("cpp-1");
    });

    it("acepta el objeto anidado", () => {
      const orden = new OrdenExamen({ idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: "cpp-2" } });

      expect(orden.idDeConsultaProcedimientoPaso()).to.equal("cpp-2");
    });

    it("devuelve null sin relación o con un objeto sin id", () => {
      expect(new OrdenExamen().idDeConsultaProcedimientoPaso()).to.equal(null);
      expect(new OrdenExamen({ idConsultaProcedimientoPaso: {} }).idDeConsultaProcedimientoPaso()).to.equal(null);
    });
  });

  describe("toJSON", () => {
    it("reduce la relación a una referencia por id", () => {
      const orden = new OrdenExamen({
        idOrdenExamen: "o1",
        indicaciones: "ind",
        idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: "cpp-1", estado: "En curso", extra: 1 },
      });

      expect(orden.toJSON().idConsultaProcedimientoPaso).to.deep.equal({ idConsultaProcedimientoPaso: "cpp-1" });
    });

    it("una relación dada como uuid también se envía como referencia", () => {
      const json = new OrdenExamen({ idConsultaProcedimientoPaso: "cpp-1" }).toJSON();

      expect(json.idConsultaProcedimientoPaso).to.deep.equal({ idConsultaProcedimientoPaso: "cpp-1" });
    });

    it("sin relación envía null", () => {
      expect(new OrdenExamen().toJSON().idConsultaProcedimientoPaso).to.equal(null);
    });

    it("JSON.stringify usa toJSON", () => {
      const orden = new OrdenExamen({ idOrdenExamen: "o1", idConsultaProcedimientoPaso: "cpp-1" });

      expect(JSON.parse(JSON.stringify(orden))).to.deep.equal({
        idOrdenExamen: "o1",
        fechaCreacion: null,
        indicaciones: null,
        idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: "cpp-1" },
      });
    });

    it("no modifica la instancia", () => {
      const orden = new OrdenExamen({ idConsultaProcedimientoPaso: { idConsultaProcedimientoPaso: "cpp-1", otro: 1 } });

      orden.toJSON();

      expect(orden.idConsultaProcedimientoPaso).to.deep.equal({ idConsultaProcedimientoPaso: "cpp-1", otro: 1 });
    });
  });
});
