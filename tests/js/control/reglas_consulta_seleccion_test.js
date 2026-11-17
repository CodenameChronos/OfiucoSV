import * as chai from "../lib/chai/index.js";
import {
  planificarSeleccion,
  cambiosDeResultados,
  mensajeExamenesQuitados,
} from "../../../src/js/control/reglas_consulta.js";

const { expect } = chai;
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("reglas_consulta (selección de exámenes y resultados)", () => {
  describe("planificarSeleccion", () => {
    it("identifica los exámenes nuevos y las órdenes que ya no están seleccionadas", () => {
      const ordenes = [
        { id: "orden-a", indicaciones: A, tieneResultado: false },
        { id: "orden-b", indicaciones: B, tieneResultado: true },
      ];

      expect(planificarSeleccion([B, C], ordenes)).to.deep.equal({
        crear: [C],
        quitar: [
          {
            idOrden: "orden-a",
            idPpe: A,
            tieneResultado: false,
            indicaciones: A,
          },
        ],
      });
    });

    it("no crea ni quita órdenes cuando la selección no cambia", () => {
      const ordenes = [
        { id: "orden-a", indicaciones: A, tieneResultado: false },
        { id: "orden-b", indicaciones: B, tieneResultado: true },
      ];

      expect(planificarSeleccion([A, B], ordenes)).to.deep.equal({
        crear: [],
        quitar: [],
      });
    });

    it("crea todos los exámenes seleccionados cuando no existen órdenes", () => {
      expect(planificarSeleccion([A, B], [])).to.deep.equal({
        crear: [A, B],
        quitar: [],
      });
    });

    it("identifica una orden con resultado al quitarla de la selección", () => {
      expect(
        planificarSeleccion([], [
          { id: "orden-a", indicaciones: A, tieneResultado: true },
        ]),
      ).to.deep.equal({
        crear: [],
        quitar: [
          {
            idOrden: "orden-a",
            idPpe: A,
            tieneResultado: true,
            indicaciones: A,
          },
        ],
      });
    });

    it("tolera selecciones y órdenes vacías", () => {
      expect(planificarSeleccion([], [])).to.deep.equal({
        crear: [],
        quitar: [],
      });
    });

    it("compara los identificadores sin distinguir mayúsculas", () => {
      expect(
        planificarSeleccion([A.toUpperCase()], [
          { id: "orden-a", indicaciones: A, tieneResultado: false },
        ]),
      ).to.deep.equal({ crear: [], quitar: [] });
    });
  });

  describe("cambiosDeResultados", () => {
    it("detecta resultados nuevos y actualizaciones en una misma operación", () => {
      const vigentes = [
        { idOrden: "orden-a", idPpe: A, resultado: null },
        {
          idOrden: "orden-b",
          idPpe: B,
          resultado: { id: "resultado-b", resultado: "Normal", interpretacion: "Sin hallazgos" },
        },
      ];
      const borrador = {
        [A]: { resultado: "Hemoglobina 10", interpretacion: "Bajo" },
        [B]: { resultado: "Hemoglobina 12", interpretacion: "Dentro del rango" },
      };

      expect(cambiosDeResultados(vigentes, borrador)).to.deep.equal({
        crear: [
          {
            idOrden: "orden-a",
            resultado: "Hemoglobina 10",
            interpretacion: "Bajo",
          },
        ],
        actualizar: [
          {
            idOrden: "orden-b",
            resultado: "Hemoglobina 12",
            interpretacion: "Dentro del rango",
          },
        ],
      });
    });

    it("no crea un resultado cuando el borrador está vacío", () => {
      const vigentes = [{ idOrden: "orden-a", idPpe: A, resultado: null }];

      expect(cambiosDeResultados(vigentes, {})).to.deep.equal({
        crear: [],
        actualizar: [],
      });
    });

    it("no actualiza un resultado cuando sus valores no cambian", () => {
      const vigentes = [
        {
          idOrden: "orden-a",
          idPpe: A,
          resultado: { id: "resultado-a", resultado: "Normal", interpretacion: "Correcto" },
        },
      ];

      expect(
        cambiosDeResultados(vigentes, {
          [A]: { resultado: "Normal", interpretacion: "Correcto" },
        }),
      ).to.deep.equal({ crear: [], actualizar: [] });
    });

    it("detecta cambios solo en la interpretación", () => {
      const vigentes = [
        {
          idOrden: "orden-a",
          idPpe: A,
          resultado: { id: "resultado-a", resultado: "Normal", interpretacion: "Anterior" },
        },
      ];

      expect(
        cambiosDeResultados(vigentes, {
          [A]: { resultado: "Normal", interpretacion: "Actualizada" },
        }),
      ).to.deep.equal({
        crear: [],
        actualizar: [
          {
            idOrden: "orden-a",
            resultado: "Normal",
            interpretacion: "Actualizada",
          },
        ],
      });
    });

    it("ignora órdenes sin identificador de examen", () => {
      expect(
        cambiosDeResultados(
          [{ idOrden: "orden-a", idPpe: null, resultado: null }],
          { [A]: { resultado: "Resultado", interpretacion: "Interpretación" } },
        ),
      ).to.deep.equal({ crear: [], actualizar: [] });
    });

    it("acepta la clave normalizada en minúsculas para localizar el borrador", () => {
      const vigentes = [{ idOrden: "orden-a", idPpe: A.toUpperCase(), resultado: null }];

      expect(
        cambiosDeResultados(vigentes, {
          [A]: { resultado: "Positivo", interpretacion: "Revisar" },
        }),
      ).to.deep.equal({
        crear: [
          { idOrden: "orden-a", resultado: "Positivo", interpretacion: "Revisar" },
        ],
        actualizar: [],
      });
    });

    it("tolera listas vacías o resultados de borrador ausentes", () => {
      expect(cambiosDeResultados([], null)).to.deep.equal({
        crear: [],
        actualizar: [],
      });
      expect(
        cambiosDeResultados([{ idOrden: "orden-a", idPpe: C, resultado: null }], null),
      ).to.deep.equal({ crear: [], actualizar: [] });
    });
  });

  describe("mensajeExamenesQuitados", () => {
    it("usa el singular cuando se quita un examen", () => {
      expect(mensajeExamenesQuitados(1)).to.equal(
        "Se ha quitado 1 examen de la selección.",
      );
    });

    it("usa el plural cuando se quitan varios exámenes", () => {
      expect(mensajeExamenesQuitados(3)).to.equal(
        "Se ha quitado 3 exámenes de la selección.",
      );
    });

    it("acepta un arreglo de nombres y calcula la cantidad", () => {
      expect(mensajeExamenesQuitados(["Hemograma", "Glucosa"])).to.equal(
        "Se ha quitado 2 exámenes de la selección.",
      );
    });

    it("devuelve null para un arreglo vacío", () => {
      expect(mensajeExamenesQuitados([])).to.equal(null);
    });

    [0, -1, 1.5, NaN, null, undefined, "2"].forEach((cantidad) => {
      it(`devuelve null para una cantidad inválida (${String(cantidad)})`, () => {
        expect(mensajeExamenesQuitados(cantidad)).to.equal(null);
      });
    });
  });
});
