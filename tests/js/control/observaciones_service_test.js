import * as chai from "../lib/chai/index.js";
const { expect } = chai;
import {
  leerTodos,
  leerPaso,
  escribirPaso,
} from "../../../src/js/control/observaciones_service.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("observaciones (bloques por paso en consulta.observaciones)", () => {
  describe("escribirPaso", () => {
    it("sobre texto vacío crea el bloque sin salto de línea inicial", () => {
      const texto = escribirPaso("", A, { notas: "hola" });

      expect(texto).to.equal(`##PASO:${A}##{"notas":"hola"}##/PASO##`);
    });

    [null, undefined].forEach((vacio) => {
      it(`trata ${vacio} como texto vacío`, () => {
        expect(escribirPaso(vacio, A, { notas: "x" })).to.match(/^##PASO:/);
      });
    });

    it("agrega un bloque nuevo al final, separado por salto de línea", () => {
      const base = escribirPaso("", A, { notas: "uno" });

      const texto = escribirPaso(base, B, { notas: "dos" });

      expect(texto.startsWith(base + "\n##PASO:" + B)).to.equal(true);
      expect(leerTodos(texto).map((p) => p.idPaso)).to.deep.equal([A, B]);
    });

    it("reemplaza el bloque del mismo paso sin duplicarlo", () => {
      const base = escribirPaso("", A, { notas: "viejo" });

      const texto = escribirPaso(base, A, { notas: "nuevo" });

      expect(leerTodos(texto)).to.have.length(1);
      expect(leerPaso(texto, A)).to.deep.equal({ notas: "nuevo" });
    });

    it("reemplaza aunque el id se pase en mayúscula", () => {
      const base = escribirPaso("", A, { notas: "viejo" });

      const texto = escribirPaso(base, A.toUpperCase(), { notas: "nuevo" });

      expect(leerTodos(texto)).to.have.length(1);
      expect(leerPaso(texto, A).notas).to.equal("nuevo");
    });

    it("no toca los demás bloques ni el texto externo", () => {
      const bloqueB = escribirPaso("", B, { notas: "intacto" });
      const base = `Antes\n${escribirPaso("", A, { notas: "viejo" })}\n${bloqueB}\nDespués`;

      const texto = escribirPaso(base, A, { notas: "nuevo" });

      expect(texto.startsWith("Antes\n")).to.equal(true);
      expect(texto.endsWith("\nDespués")).to.equal(true);
      expect(texto).to.contain(bloqueB);
      expect(leerPaso(texto, A).notas).to.equal("nuevo");
    });

    it("es idempotente: escribir dos veces lo mismo deja un solo bloque", () => {
      const una = escribirPaso("", A, { notas: "x" });

      expect(escribirPaso(una, A, { notas: "x" })).to.equal(una);
    });

    it("el texto del médico nunca deja un # literal dentro del bloque", () => {
      const notas = 'con # y ##/PASO## y ##PASO:x## y\nsalto "comillas"';

      const texto = escribirPaso("", A, { notas });
      const bloque = /^##PASO:[0-9a-f-]{36}##([^#]*)##\/PASO##$/.exec(texto);

      expect(bloque, "el bloque debe seguir siendo parseable").to.not.equal(
        null,
      );
      expect(leerPaso(texto, A).notas).to.equal(notas);
    });

    it("no interpreta patrones especiales de replace ($&, $1, $$) en el texto", () => {
      const base = escribirPaso("", A, { notas: "x" });
      const notas = "cuesta $& $1 $$ $`";

      const texto = escribirPaso(base, A, { notas });

      expect(leerPaso(texto, A).notas).to.equal(notas);
      expect(leerTodos(texto)).to.have.length(1);
    });

    it("conserva acentos, saltos de línea y emojis", () => {
      const notas = "Dolor torácico\n  paciente refiere náuseas 🤒";

      expect(leerPaso(escribirPaso("", A, { notas }), A).notas).to.equal(notas);
    });

    ["no-uuid", "", null, undefined, 5].forEach((id) => {
      it(`lanza TypeError con un idPaso inválido (${JSON.stringify(id)})`, () => {
        expect(() => escribirPaso("", id, { notas: "x" })).to.throw(
          TypeError,
          /UUID/,
        );
      });
    });

    [null, undefined, "texto", 5, [1, 2]].forEach((datos) => {
      it(`lanza TypeError si datos no es un objeto (${JSON.stringify(datos)})`, () => {
        expect(() => escribirPaso("", A, datos)).to.throw(TypeError, /objeto/);
      });
    });
  });

  describe("leerTodos", () => {
    [null, undefined, "", "texto sin bloques"].forEach((texto) => {
      it(`devuelve [] para ${JSON.stringify(texto)}`, () => {
        expect(leerTodos(texto)).to.deep.equal([]);
      });
    });

    it("devuelve los pasos en orden de aparición con el id en minúscula", () => {
      const texto = `##PASO:${B.toUpperCase()}##{"n":2}##/PASO##\n##PASO:${A}##{"n":1}##/PASO##`;

      expect(leerTodos(texto)).to.deep.equal([
        { idPaso: B, datos: { n: 2 } },
        { idPaso: A, datos: { n: 1 } },
      ]);
    });

    it("omite los bloques con JSON dañado y conserva el resto", () => {
      const texto = `##PASO:${A}##{roto##/PASO##\n##PASO:${B}##{"ok":true}##/PASO##`;

      expect(leerTodos(texto)).to.deep.equal([
        { idPaso: B, datos: { ok: true } },
      ]);
    });

    ["[1,2]", "5", '"texto"', "null"].forEach((json) => {
      it(`omite un bloque cuyo JSON no es un objeto (${json})`, () => {
        expect(leerTodos(`##PASO:${A}##${json}##/PASO##`)).to.deep.equal([]);
      });
    });

    it("ignora el texto fuera de los bloques", () => {
      const texto = `nota suelta\n##PASO:${A}##{"a":1}##/PASO##\notra nota`;

      expect(leerTodos(texto)).to.have.length(1);
    });
  });

  describe("leerPaso", () => {
    it("devuelve los datos del paso pedido", () => {
      const texto = escribirPaso(escribirPaso("", A, { n: 1 }), B, { n: 2 });

      expect(leerPaso(texto, B)).to.deep.equal({ n: 2 });
    });

    it("devuelve null si el paso no tiene bloque", () => {
      expect(leerPaso(escribirPaso("", A, { n: 1 }), B)).to.equal(null);
      expect(leerPaso("", A)).to.equal(null);
      expect(leerPaso(null, A)).to.equal(null);
    });

    it("acepta el id en mayúscula", () => {
      expect(
        leerPaso(escribirPaso("", A, { n: 1 }), A.toUpperCase()),
      ).to.deep.equal({ n: 1 });
    });

    it("lanza TypeError con un idPaso inválido", () => {
      expect(() => leerPaso("", "nope")).to.throw(TypeError, /UUID/);
    });
  });
});
