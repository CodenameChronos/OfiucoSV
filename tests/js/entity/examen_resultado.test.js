import { expect } from "chai";
import ExamenResultado from "../../src/js/entity/examenResultado.js";

describe("entity ExamenResultado", () => {
  it("sin datos deja todos los campos en null", () => {
    expect({ ...new ExamenResultado() }).to.deep.equal({
      idExamenResultado: null,
      fechaCreacion: null,
      resultado: null,
      interpretacion: null,
      rutaAtestado: null,
      idOrdenExamen: null,
    });
  });

  it("copia resultado e interpretación", () => {
    const r = new ExamenResultado({ resultado: "plaquetas bajas", interpretacion: "Hay que repetir" });

    expect(r.resultado).to.equal("plaquetas bajas");
    expect(r.interpretacion).to.equal("Hay que repetir");
  });

  it("fromJSON devuelve null para null y undefined, e instancia en otro caso", () => {
    expect(ExamenResultado.fromJSON(null)).to.equal(null);
    expect(ExamenResultado.fromJSON(undefined)).to.equal(null);
    expect(ExamenResultado.fromJSON({})).to.be.instanceOf(ExamenResultado);
  });

  describe("idDeOrdenExamen", () => {
    it("acepta uuid suelto y objeto anidado", () => {
      expect(new ExamenResultado({ idOrdenExamen: "o1" }).idDeOrdenExamen()).to.equal("o1");
      expect(new ExamenResultado({ idOrdenExamen: { idOrdenExamen: "o2" } }).idDeOrdenExamen()).to.equal("o2");
    });

    it("devuelve null sin relación", () => {
      expect(new ExamenResultado().idDeOrdenExamen()).to.equal(null);
      expect(new ExamenResultado({ idOrdenExamen: {} }).idDeOrdenExamen()).to.equal(null);
    });
  });

  describe("toJSON", () => {
    it("reduce la orden a una referencia por id", () => {
      const json = new ExamenResultado({
        idOrdenExamen: { idOrdenExamen: "o1", indicaciones: "x" },
      }).toJSON();

      expect(json.idOrdenExamen).to.deep.equal({ idOrdenExamen: "o1" });
    });

    it("sin orden envía null", () => {
      expect(new ExamenResultado().toJSON().idOrdenExamen).to.equal(null);
    });

    it("conserva los textos y JSON.stringify usa toJSON", () => {
      const r = new ExamenResultado({
        idExamenResultado: "r1",
        resultado: "TA 140/90",
        interpretacion: "Presión alta",
        idOrdenExamen: "o1",
      });

      expect(JSON.parse(JSON.stringify(r))).to.deep.include({
        idExamenResultado: "r1",
        resultado: "TA 140/90",
        interpretacion: "Presión alta",
      });
      expect(JSON.parse(JSON.stringify(r)).idOrdenExamen).to.deep.equal({ idOrdenExamen: "o1" });
    });
  });
});
