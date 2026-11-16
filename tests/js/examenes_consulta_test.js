import { expect } from "chai";
import {
  clave,
  soloLectura,
  conciliarSeleccion,
  borradorDesdeVista,
  hayCambios,
  modeloResultados,
  modeloAsignador,
  agregarExamen,
  quitarExamen,
  escribirResultado,
} from "../../src/js/control/examenes_consulta.js";

const vistaBase = (extra = {}) => ({
  completa: false,
  referenciaExterna: "REF-1",
  notas: "nota",
  paso: { editable: true },
  examenes: [
    { idProcedimientoPasoExamen: "AAA", nombre: "Glucosa", ordenado: true },
    { idProcedimientoPasoExamen: "BBB", nombre: "Hemograma", ordenado: true },
    { idProcedimientoPasoExamen: "CCC", nombre: "Orina", ordenado: false },
  ],
  ordenes: [
    {
      idOrdenExamen: "o1",
      idProcedimientoPasoExamen: "AAA",
      nombre: "Glucosa",
      resultado: {
        idExamenResultado: "r1",
        resultado: "90 mg/dl",
        interpretacion: "Normal",
      },
    },
    {
      idOrdenExamen: "o2",
      idProcedimientoPasoExamen: "BBB",
      nombre: "Hemograma",
      resultado: null,
    },
  ],
  ...extra,
});

describe("examenes_consulta", () => {
  describe("clave / soloLectura", () => {
    it("clave pasa a minúsculas y nunca devuelve null", () => {
      expect(clave("AbC")).to.equal("abc");
      expect(clave(null)).to.equal("");
      expect(clave(undefined)).to.equal("");
    });

    it("soloLectura: paso no editable o consulta completa", () => {
      expect(soloLectura(vistaBase())).to.equal(false);
      expect(soloLectura(vistaBase({ paso: { editable: false } }))).to.equal(
        true,
      );
      expect(soloLectura(vistaBase({ completa: true }))).to.equal(true);
    });
  });

  describe("conciliarSeleccion", () => {
    it("conserva el seleccionado si sigue existiendo (aunque cambie la lista)", () => {
      expect(conciliarSeleccion(["a", "b"], "b", ["a", "b", "c"])).to.equal(
        "b",
      );
      expect(conciliarSeleccion(["a", "b", "c"], "b", ["b"])).to.equal("b");
    });

    it("compara sin distinguir mayúsculas", () => {
      expect(conciliarSeleccion(["A", "B"], "B", ["a", "b"])).to.equal("b");
    });

    it("si desaparece, toma el que ocupa su misma posición", () => {
      expect(conciliarSeleccion(["a", "b", "c"], "b", ["a", "c"])).to.equal(
        "c",
      );
    });

    it("si desaparece el último, toma el nuevo último", () => {
      expect(conciliarSeleccion(["a", "b", "c"], "c", ["a", "b"])).to.equal(
        "b",
      );
    });

    it("sin selección previa con lista nueva, el primero", () => {
      expect(conciliarSeleccion([], null, ["x", "y"])).to.equal("x");
    });

    it("la primera carga tras agregar el primer examen selecciona el primero", () => {
      expect(conciliarSeleccion([], null, ["x"])).to.equal("x");
    });

    it("un seleccionado desconocido en la lista anterior cae al primero", () => {
      expect(conciliarSeleccion(["a"], "zzz", ["x", "y"])).to.equal("x");
    });

    it("sin órdenes devuelve null", () => {
      expect(conciliarSeleccion(["a"], "a", [])).to.equal(null);
    });
  });

  describe("borradorDesdeVista", () => {
    it("normaliza ids y copia textos", () => {
      const b = borradorDesdeVista(vistaBase());

      expect(b.referenciaExterna).to.equal("REF-1");
      expect(b.notas).to.equal("nota");
      expect(b.examenes).to.deep.equal(["aaa", "bbb"]);
      expect(b.resultados.aaa).to.deep.equal({
        resultado: "90 mg/dl",
        interpretacion: "Normal",
      });
    });

    it("un examen sin resultado queda con textos vacíos", () => {
      expect(borradorDesdeVista(vistaBase()).resultados.bbb).to.deep.equal({
        resultado: "",
        interpretacion: "",
      });
    });

    it("sin órdenes ni textos devuelve un borrador vacío", () => {
      const b = borradorDesdeVista({ ordenes: [] });

      expect(b).to.deep.equal({
        referenciaExterna: "",
        notas: "",
        examenes: [],
        resultados: {},
      });
    });
  });

  describe("hayCambios", () => {
    it("falso cuando el borrador es el reflejo de la vista", () => {
      const vista = vistaBase();

      expect(hayCambios(borradorDesdeVista(vista), vista)).to.equal(false);
    });

    it("verdadero si cambian las notas o la referencia", () => {
      const vista = vistaBase();
      const b = borradorDesdeVista(vista);

      expect(hayCambios({ ...b, notas: "otra" }, vista)).to.equal(true);
      expect(hayCambios({ ...b, referenciaExterna: "X" }, vista)).to.equal(
        true,
      );
    });

    it("ignora diferencias de espacios en los extremos", () => {
      const vista = vistaBase();
      const b = borradorDesdeVista(vista);

      expect(hayCambios({ ...b, notas: "  nota  " }, vista)).to.equal(false);
    });

    it("verdadero si se agrega o se quita un examen", () => {
      const vista = vistaBase();
      const b = borradorDesdeVista(vista);

      expect(hayCambios(agregarExamen(b, "CCC"), vista)).to.equal(true);
      expect(hayCambios(quitarExamen(b, "AAA"), vista)).to.equal(true);
    });

    it("el orden de los exámenes no cuenta como cambio", () => {
      const vista = vistaBase();
      const b = borradorDesdeVista(vista);

      expect(
        hayCambios({ ...b, examenes: [...b.examenes].reverse() }, vista),
      ).to.equal(false);
    });

    it("verdadero si cambia un resultado o una interpretación", () => {
      const vista = vistaBase();
      const b = borradorDesdeVista(vista);

      expect(
        hayCambios(
          escribirResultado(b, "BBB", "resultado", "plaquetas bajas"),
          vista,
        ),
      ).to.equal(true);
      expect(
        hayCambios(
          escribirResultado(b, "AAA", "interpretacion", "Todo bien"),
          vista,
        ),
      ).to.equal(true);
    });

    it("escribir y borrar el texto de un examen sin resultado no es cambio", () => {
      const vista = vistaBase();
      const b = borradorDesdeVista(vista);

      expect(
        hayCambios(escribirResultado(b, "BBB", "resultado", "   "), vista),
      ).to.equal(false);
    });

    it("un borrador sin llaves normalizadas se compara igual", () => {
      const vista = vistaBase();
      const b = borradorDesdeVista(vista);
      const conMayusculas = {
        ...b,
        resultados: { AAA: b.resultados.aaa, BBB: b.resultados.bbb },
      };

      expect(hayCambios(conMayusculas, vista)).to.equal(false);
    });
  });

  describe("modeloResultados", () => {
    it("lista solo los exámenes ya ordenados, no los pendientes del borrador", () => {
      const vista = vistaBase();
      const b = agregarExamen(borradorDesdeVista(vista), "CCC");

      const m = modeloResultados(vista, b, "aaa");

      expect(m.items.map((i) => i.id)).to.deep.equal(["aaa", "bbb"]);
      expect(m.pendientes).to.equal(1);
    });

    it("marca tieneResultado según el borrador (responde mientras se escribe)", () => {
      const vista = vistaBase();
      let b = borradorDesdeVista(vista);
      expect(
        modeloResultados(vista, b, "aaa").items[1].tieneResultado,
      ).to.equal(false);

      b = escribirResultado(b, "bbb", "resultado", "plaquetas bajas");

      expect(
        modeloResultados(vista, b, "aaa").items[1].tieneResultado,
      ).to.equal(true);
    });

    it("marca quitando los exámenes que salieron del borrador", () => {
      const vista = vistaBase();
      const b = quitarExamen(borradorDesdeVista(vista), "AAA");

      const m = modeloResultados(vista, b, "aaa");

      expect(m.items.find((i) => i.id === "aaa").quitando).to.equal(true);
      expect(m.items.find((i) => i.id === "bbb").quitando).to.equal(false);
    });

    it("entrega los valores por examen y la selección normalizada", () => {
      const vista = vistaBase();
      const m = modeloResultados(vista, borradorDesdeVista(vista), "AAA");

      expect(m.seleccionado).to.equal("aaa");
      expect(m.valores.aaa).to.deep.equal({
        resultado: "90 mg/dl",
        interpretacion: "Normal",
      });
    });

    it("sin órdenes devuelve lista vacía y cuenta los pendientes", () => {
      const vista = vistaBase({ ordenes: [] });
      const b = { examenes: ["aaa", "bbb"], resultados: {} };

      const m = modeloResultados(vista, b, null);

      expect(m.items).to.deep.equal([]);
      expect(m.seleccionado).to.equal(null);
      expect(m.pendientes).to.equal(2);
    });

    it("readonly sigue a soloLectura", () => {
      const vista = vistaBase({ completa: true });

      expect(
        modeloResultados(vista, borradorDesdeVista(vista), null).readonly,
      ).to.equal(true);
    });
  });

  describe("modeloAsignador", () => {
    it("normaliza el catálogo y la selección", () => {
      const vista = vistaBase();
      const m = modeloAsignador(vista, borradorDesdeVista(vista));

      expect(m.catalogo.map((e) => e.id)).to.deep.equal(["aaa", "bbb", "ccc"]);
      expect(m.catalogo[2].ordenado).to.equal(false);
      expect(m.seleccion).to.deep.equal(["aaa", "bbb"]);
      expect(m.readonly).to.equal(false);
    });
  });

  describe("reductores del borrador", () => {
    it("agregarExamen no duplica y no muta el original", () => {
      const original = { examenes: ["aaa"], resultados: {} };

      const nuevo = agregarExamen(agregarExamen(original, "BBB"), "bbb");

      expect(nuevo.examenes).to.deep.equal(["aaa", "bbb"]);
      expect(original.examenes).to.deep.equal(["aaa"]);
    });

    it("quitarExamen quita sin distinguir mayúsculas y conserva el texto escrito", () => {
      const original = {
        examenes: ["aaa", "bbb"],
        resultados: { aaa: { resultado: "x", interpretacion: "" } },
      };

      const nuevo = quitarExamen(original, "AAA");

      expect(nuevo.examenes).to.deep.equal(["bbb"]);
      expect(nuevo.resultados.aaa.resultado).to.equal("x");
    });

    it("escribirResultado actualiza un campo, conserva el otro y no muta", () => {
      const original = {
        examenes: ["aaa"],
        resultados: { aaa: { resultado: "a", interpretacion: "b" } },
      };

      const nuevo = escribirResultado(
        original,
        "AAA",
        "interpretacion",
        "nueva",
      );

      expect(nuevo.resultados.aaa).to.deep.equal({
        resultado: "a",
        interpretacion: "nueva",
      });
      expect(original.resultados.aaa.interpretacion).to.equal("b");
    });

    it("escribirResultado crea la entrada si el examen no tenía", () => {
      const nuevo = escribirResultado(
        { examenes: [], resultados: {} },
        "ZZZ",
        "resultado",
        "v",
      );

      expect(nuevo.resultados.zzz).to.deep.equal({
        resultado: "v",
        interpretacion: "",
      });
    });
  });
});
