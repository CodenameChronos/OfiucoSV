import * as chai from "../lib/chai/index.js";
const { expect } = chai;
import {
  ErrorSecuencia,
  ordenar,
  anterior,
  siguiente,
} from "../../../src/js/control/secuencia_service.js";

const fila = (paso, referencia = null) => ({ paso, referencia });

describe("secuencia (orden lineal de los pasos de un procedimiento)", () => {
  describe("ordenar", () => {
    it("sin pasos devuelve []", () => {
      expect(ordenar([], [])).to.deep.equal([]);
    });

    it("un solo paso sin secuencias", () => {
      expect(ordenar(["a"], [])).to.deep.equal(["a"]);
    });

    it("recorre la cadena desde el paso sin anterior", () => {
      expect(
        ordenar(["a", "b", "c"], [fila("b", "a"), fila("c", "b")]),
      ).to.deep.equal(["a", "b", "c"]);
    });

    it("no depende del orden en que llegan los pasos ni las filas", () => {
      expect(
        ordenar(["c", "a", "b"], [fila("c", "b"), fila("b", "a")]),
      ).to.deep.equal(["a", "b", "c"]);
    });

    it("una fila con referencia null o ausente significa 'sin anterior'", () => {
      expect(
        ordenar(["a", "b"], [fila("a", null), fila("b", "a")]),
      ).to.deep.equal(["a", "b"]);
      expect(
        ordenar(["a", "b"], [{ paso: "a" }, fila("b", "a")]),
      ).to.deep.equal(["a", "b"]);
    });

    it("ignora filas de otro procedimiento (paso que no está en la lista)", () => {
      const secuencias = [fila("b", "a"), fila("x", "y"), fila("z", "a")];

      expect(ordenar(["a", "b"], secuencias)).to.deep.equal(["a", "b"]);
    });

    it("lanza ErrorSecuencia si hay pasos repetidos", () => {
      expect(() => ordenar(["a", "a"], [])).to.throw(
        ErrorSecuencia,
        /repetidos/,
      );
    });

    it("lanza si la referencia no pertenece al procedimiento", () => {
      expect(() => ordenar(["a", "b"], [fila("b", "zzz")])).to.throw(
        ErrorSecuencia,
        /no pertenece/,
      );
    });

    it("lanza si un paso se referencia a sí mismo", () => {
      expect(() => ordenar(["a", "b"], [fila("b", "b")])).to.throw(
        ErrorSecuencia,
        /sí mismo/,
      );
    });

    it("lanza si un paso tiene más de un anterior", () => {
      expect(() =>
        ordenar(["a", "b", "c"], [fila("c", "a"), fila("c", "b")]),
      ).to.throw(ErrorSecuencia, /más de un anterior/);
    });

    it("lanza si un paso tiene más de un siguiente (secuencia no lineal)", () => {
      expect(() =>
        ordenar(["a", "b", "c"], [fila("b", "a"), fila("c", "a")]),
      ).to.throw(ErrorSecuencia, /más de un siguiente/);
    });

    it("lanza si no hay paso inicial (ciclo completo)", () => {
      expect(() =>
        ordenar(
          ["a", "b", "c"],
          [fila("a", "c"), fila("b", "a"), fila("c", "b")],
        ),
      ).to.throw(ErrorSecuencia, /único paso inicial y hay 0/);
    });

    it("lanza si hay más de un paso inicial (cadenas separadas)", () => {
      expect(() =>
        ordenar(["a", "b", "c", "d"], [fila("b", "a"), fila("d", "c")]),
      ).to.throw(ErrorSecuencia, /único paso inicial y hay 2/);
    });

    it("lanza si un ciclo queda desconectado de la cadena principal", () => {
      expect(() =>
        ordenar(
          ["a", "b", "c", "d"],
          [fila("b", "a"), fila("c", "d"), fila("d", "c")],
        ),
      ).to.throw(ErrorSecuencia, /desconectada|ciclo/);
    });

    it("el error es ErrorSecuencia y conserva su nombre", () => {
      try {
        ordenar(["a", "a"], []);
        expect.fail("debía lanzar");
      } catch (error) {
        expect(error).to.be.instanceOf(ErrorSecuencia);
        expect(error.name).to.equal("ErrorSecuencia");
      }
    });
  });

  describe("anterior y siguiente", () => {
    const orden = ["a", "b", "c"];

    it("anterior del primero es null", () => {
      expect(anterior(orden, "a")).to.equal(null);
    });

    it("siguiente del último es null", () => {
      expect(siguiente(orden, "c")).to.equal(null);
    });

    it("devuelven los vecinos en el medio", () => {
      expect(anterior(orden, "b")).to.equal("a");
      expect(siguiente(orden, "b")).to.equal("c");
    });

    it("un procedimiento de un solo paso no tiene anterior ni siguiente", () => {
      expect(anterior(["a"], "a")).to.equal(null);
      expect(siguiente(["a"], "a")).to.equal(null);
    });

    it("lanzan ErrorSecuencia si el paso no está en la secuencia", () => {
      expect(() => anterior(orden, "x")).to.throw(ErrorSecuencia, /no está/);
      expect(() => siguiente(orden, "x")).to.throw(ErrorSecuencia, /no está/);
    });
  });
});
