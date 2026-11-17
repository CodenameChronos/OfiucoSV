import * as chai from "../lib/chai/index.js";
const { expect } = chai;
import {
  leerIds,
  escribirIds,
} from "../../../src/js/control/indicaciones_service.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("indicaciones (codec de OrdenExamen.indicaciones)", () => {
  describe("leerIds", () => {
    [null, undefined, "", "   ", "sin ids aquí"].forEach((texto) => {
      it(`devuelve [] para ${JSON.stringify(texto)}`, () => {
        expect(leerIds(texto)).to.deep.equal([]);
      });
    });

    it("extrae un UUID", () => {
      expect(leerIds(A)).to.deep.equal([A]);
    });

    it("extrae varios UUID en orden de aparición", () => {
      expect(leerIds(`${B}\n${A}\n${C}`)).to.deep.equal([B, A, C]);
    });

    it("pasa a minúscula", () => {
      expect(leerIds(A.toUpperCase())).to.deep.equal([A]);
    });

    it("no repite ids aunque aparezcan en mayúscula y minúscula", () => {
      expect(leerIds(`${A}\n${A.toUpperCase()}\n${B}`)).to.deep.equal([A, B]);
    });

    it("recupera los ids aunque haya texto adicional escrito a mano", () => {
      expect(leerIds(`Pedir en ayunas: ${A}, y también ${B}.`)).to.deep.equal([
        A,
        B,
      ]);
    });

    it("ignora cadenas con forma casi de UUID", () => {
      expect(leerIds("1111-1111-4111-8111-111111111111")).to.deep.equal([]);
      expect(leerIds("zzzzzzzz-1111-4111-8111-111111111111")).to.deep.equal([]);
    });

    it("convierte a texto un valor que no es string", () => {
      expect(leerIds(12345)).to.deep.equal([]);
    });
  });

  describe("escribirIds", () => {
    it("devuelve cadena vacía sin ids", () => {
      expect(escribirIds([])).to.equal("");
    });

    it("escribe un UUID por línea", () => {
      expect(escribirIds([A, B])).to.equal(`${A}\n${B}`);
    });

    it("normaliza a minúscula y elimina repetidos conservando el orden", () => {
      expect(escribirIds([B.toUpperCase(), A, B])).to.equal(`${B}\n${A}`);
    });

    [null, undefined, "texto", 5, {}].forEach((valor) => {
      it(`lanza TypeError si ids no es un arreglo (${JSON.stringify(valor)})`, () => {
        expect(() => escribirIds(valor)).to.throw(TypeError, /arreglo/);
      });
    });

    ["no-es-uuid", "", 123, null, `${A} `, `x${A}`].forEach((invalido) => {
      it(`lanza TypeError ante un elemento inválido (${JSON.stringify(invalido)})`, () => {
        expect(() => escribirIds([A, invalido])).to.throw(TypeError);
      });
    });

    it("no escribe nada si algún elemento es inválido (falla antes de devolver)", () => {
      expect(() => escribirIds([A, "malo"])).to.throw(TypeError, /malo/);
    });
  });

  describe("ida y vuelta", () => {
    it("leerIds(escribirIds(ids)) recupera los ids normalizados", () => {
      expect(leerIds(escribirIds([C, A.toUpperCase(), B]))).to.deep.equal([
        C,
        A,
        B,
      ]);
    });

    it("escribirIds(leerIds(texto)) es estable (idempotente)", () => {
      const una = escribirIds(leerIds(`${A}\n${B}`));
      expect(escribirIds(leerIds(una))).to.equal(una);
    });
  });
});
