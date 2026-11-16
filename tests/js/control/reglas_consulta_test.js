import * as chai from "../../lib/chai/index.js";
import {
  idsOrdenados,
  examenesPorOrdenar,
  ordenesSinResultado,
  mensajeResultadosPendientes,
  calcularEdad,
  pasoActual,
} from "../../../src/js/control/reglas_consulta.js";
import { Estado } from "../../../src/js/control/estado_paso.js";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("reglas_consulta (reglas puras de la atención)", () => {
  describe("idsOrdenados", () => {
    it("sin órdenes devuelve []", () => {
      expect(idsOrdenados([])).to.deep.equal([]);
    });

    it("junta los ids de todas las órdenes sin repetir", () => {
      const ordenes = [{ indicaciones: A }, { indicaciones: `${B}\n${A}` }];

      expect(idsOrdenados(ordenes)).to.deep.equal([A, B]);
    });

    it("tolera órdenes sin indicaciones o nulas", () => {
      const ordenes = [{ indicaciones: null }, {}, null, { indicaciones: A }];

      expect(idsOrdenados(ordenes)).to.deep.equal([A]);
    });
  });

  describe("examenesPorOrdenar", () => {
    it("devuelve los marcados que aún no tienen orden, en el orden marcado", () => {
      expect(
        examenesPorOrdenar([C, A, B], [{ indicaciones: A }]),
      ).to.deep.equal([C, B]);
    });

    it("no vuelve a ordenar lo ya ordenado (evita duplicados al pulsar dos veces)", () => {
      expect(examenesPorOrdenar([A], [{ indicaciones: A }])).to.deep.equal([]);
    });

    it("sin órdenes previas devuelve todos los marcados", () => {
      expect(examenesPorOrdenar([A, B], [])).to.deep.equal([A, B]);
    });

    it("sin marcados devuelve []", () => {
      expect(examenesPorOrdenar([], [{ indicaciones: A }])).to.deep.equal([]);
    });

    it("compara sin distinguir mayúsculas y quita repetidos", () => {
      expect(
        examenesPorOrdenar([A.toUpperCase(), B, B], [{ indicaciones: A }]),
      ).to.deep.equal([B]);
    });

    it("lanza TypeError si lo marcado no es un arreglo de UUID", () => {
      expect(() => examenesPorOrdenar(["no-uuid"], [])).to.throw(TypeError);
      expect(() => examenesPorOrdenar(null, [])).to.throw(TypeError);
    });
  });

  describe("ordenesSinResultado", () => {
    const ordenes = [{ id: "o1" }, { id: "o2" }, { id: "o3" }];

    it("todas sin resultado cuando no hay resultados", () => {
      expect(ordenesSinResultado(ordenes, [])).to.deep.equal([
        "o1",
        "o2",
        "o3",
      ]);
    });

    it("excluye las que tienen un resultado con texto", () => {
      const resultados = [{ idOrden: "o2", resultado: "plaquetas bajas" }];

      expect(ordenesSinResultado(ordenes, resultados)).to.deep.equal([
        "o1",
        "o3",
      ]);
    });

    [null, "", "   ", "\n\t"].forEach((vacio) => {
      it(`un resultado vacío (${JSON.stringify(vacio)}) cuenta como sin resultado`, () => {
        expect(
          ordenesSinResultado(
            [{ id: "o1" }],
            [{ idOrden: "o1", resultado: vacio }],
          ),
        ).to.deep.equal(["o1"]);
      });
    });

    it("compara los ids sin distinguir mayúsculas y devuelve los ids originales", () => {
      const lista = [{ id: "ABC" }];

      expect(
        ordenesSinResultado(lista, [{ idOrden: "abc", resultado: "ok" }]),
      ).to.deep.equal([]);
      expect(ordenesSinResultado(lista, [])).to.deep.equal(["ABC"]);
    });

    it("tolera resultados nulos en la lista", () => {
      expect(ordenesSinResultado([{ id: "o1" }], [null])).to.deep.equal(["o1"]);
    });

    it("sin órdenes devuelve []", () => {
      expect(
        ordenesSinResultado([], [{ idOrden: "x", resultado: "y" }]),
      ).to.deep.equal([]);
    });
  });

  describe("mensajeResultadosPendientes", () => {
    [0, -1, 1.5, NaN, null, undefined, "2"].forEach((cantidad) => {
      it(`devuelve null para ${String(cantidad)}`, () => {
        expect(mensajeResultadosPendientes(cantidad)).to.equal(null);
      });
    });

    it("usa el singular con 1", () => {
      expect(mensajeResultadosPendientes(1)).to.equal(
        "Hay 1 examen sin resultado. ¿Desea continuar de todos modos?",
      );
    });

    it("usa el plural con 2 o más", () => {
      expect(mensajeResultadosPendientes(3)).to.equal(
        "Hay 3 exámenes sin resultado. ¿Desea continuar de todos modos?",
      );
    });
  });

  describe("calcularEdad", () => {
    // `hoy` se construye con la zona local; la fecha de nacimiento se lee en UTC.
    const hoy = (anio, mes, dia) => new Date(anio, mes - 1, dia);

    [null, undefined, ""].forEach((vacio) => {
      it(`devuelve null si falta la fecha (${JSON.stringify(vacio)})`, () => {
        expect(calcularEdad(vacio, hoy(2026, 5, 15))).to.equal(null);
      });
    });

    it("devuelve null si la fecha es inválida", () => {
      expect(calcularEdad("no es fecha", hoy(2026, 5, 15))).to.equal(null);
    });

    it("devuelve null si la fecha es futura", () => {
      expect(calcularEdad("2030-01-01T00:00:00Z", hoy(2026, 5, 15))).to.equal(
        null,
      );
    });

    it("el día del cumpleaños ya cuenta el año", () => {
      expect(calcularEdad("1990-05-15T00:00:00Z", hoy(2026, 5, 15))).to.equal(
        36,
      );
    });

    it("el día anterior al cumpleaños todavía no", () => {
      expect(calcularEdad("1990-05-15T00:00:00Z", hoy(2026, 5, 14))).to.equal(
        35,
      );
    });

    it("el mes anterior al cumpleaños todavía no", () => {
      expect(calcularEdad("1990-05-15T00:00:00Z", hoy(2026, 4, 30))).to.equal(
        35,
      );
    });

    it("un mes posterior al cumpleaños ya cuenta el año", () => {
      expect(calcularEdad("1990-05-15T00:00:00Z", hoy(2026, 6, 1))).to.equal(
        36,
      );
    });

    it("lee la fecha en UTC: no retrocede un día en zonas al oeste de UTC", () => {
      expect(
        calcularEdad("1990-05-15T00:00:00.000Z", hoy(2026, 5, 15)),
      ).to.equal(36);
    });

    it("un recién nacido tiene 0 años", () => {
      expect(calcularEdad("2026-05-01T00:00:00Z", hoy(2026, 5, 15))).to.equal(
        0,
      );
    });

    it("acepta un Date, un timestamp y una fecha sin hora", () => {
      const ms = Date.UTC(1990, 4, 15);

      expect(calcularEdad(new Date(ms), hoy(2026, 5, 15))).to.equal(36);
      expect(calcularEdad(ms, hoy(2026, 5, 15))).to.equal(36);
      expect(calcularEdad("1990-05-15", hoy(2026, 5, 15))).to.equal(36);
    });

    it("usa la fecha actual cuando no se pasa `hoy`", () => {
      expect(calcularEdad("2000-01-01T00:00:00Z"))
        .to.be.a("number")
        .and.to.be.greaterThan(20);
    });
  });

  describe("pasoActual", () => {
    const orden = ["p1", "p2", "p3"];

    it("prefiere el paso En curso aunque haya anteriores sin finalizar", () => {
      const estados = { p1: Estado.PENDIENTE, p2: Estado.EN_CURSO };

      expect(pasoActual(orden, estados)).to.equal("p2");
    });

    it("sin paso En curso, el primero que no está finalizado", () => {
      const estados = { p1: Estado.FINALIZADO, p2: Estado.PENDIENTE };

      expect(pasoActual(orden, estados)).to.equal("p2");
    });

    it("un paso sin registro cuenta como no finalizado", () => {
      const estados = { p1: Estado.FINALIZADO, p2: Estado.FINALIZADO };

      expect(pasoActual(orden, estados)).to.equal("p3");
    });

    it("con todos los pasos sin registro, el primero", () => {
      expect(pasoActual(orden, {})).to.equal("p1");
    });

    it("devuelve null cuando todos están finalizados (consulta completa)", () => {
      const estados = {
        p1: Estado.FINALIZADO,
        p2: Estado.FINALIZADO,
        p3: Estado.FINALIZADO,
      };

      expect(pasoActual(orden, estados)).to.equal(null);
    });

    it("sin pasos devuelve null", () => {
      expect(pasoActual([], {})).to.equal(null);
    });

    it("acepta los estados como Map", () => {
      const estados = new Map([
        ["p1", Estado.FINALIZADO],
        ["p2", Estado.EN_CURSO],
      ]);

      expect(pasoActual(orden, estados)).to.equal("p2");
    });
  });
});
