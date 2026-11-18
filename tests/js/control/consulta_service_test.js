import * as chai from "../lib/chai/index.js";
import sinon from "../lib/sinon/sinon-esm.js";
import ConsultaService from "../../../src/js/control/consulta_service.js";

const { expect } = chai;

describe("ConsultaService (consultas por persona-rol y filtros)", () => {
  afterEach(() => sinon.restore());

  describe("constructor y findById", () => {
    it("construye la ruta anidada codificando el idPersonaRol", () => {
      const service = new ConsultaService("rol / 1");
      expect(service.URL).to.include("persona-rol/rol%20%2F%201/consulta");
    });

    it("usa la ruta base de persona-rol cuando no se proporciona un padre", () => {
      const service = new ConsultaService();
      expect(service.URL).to.match(/persona-rol$/);
    });
  });

  describe("filtrarConsultas", () => {
    const consultas = [
      { idConsulta: "a", clinica: { idClinica: "c1" }, fechaInicio: new Date(2026, 4, 10, 8) },
      { idConsulta: "b", clinica: "c1", fechaInicio: new Date(2026, 4, 15, 23, 59) },
      { idConsulta: "c", clinica: { idClinica: "c2" }, fechaInicio: new Date(2026, 4, 15, 12) },
      { idConsulta: "d", clinica: "c1", fechaInicio: new Date(2026, 4, 16, 0) },
    ];

    it("filtra por clínica tanto si llega como objeto como si llega como UUID", () => {
      expect(ConsultaService.filtrarConsultas(consultas, { idClinica: "c1" })
        .map((c) => c.idConsulta)).to.deep.equal(["a", "b", "d"]);
    });

    it("incluye ambos extremos del rango de fechas indicado", () => {
      expect(ConsultaService.filtrarConsultas(consultas, {
        desde: "2026-05-15",
        hasta: "2026-05-15",
      }).map((c) => c.idConsulta)).to.deep.equal(["b", "c"]);
    });

    it("combina clínica y fechas", () => {
      expect(ConsultaService.filtrarConsultas(consultas, {
        idClinica: "c1",
        desde: "2026-05-15",
        hasta: "2026-05-15",
      }).map((c) => c.idConsulta)).to.deep.equal(["b"]);
    });

    it("excluye fechas inválidas cuando se solicita un rango", () => {
      const lista = [
        { idConsulta: "valida", fechaInicio: new Date(2026, 4, 15) },
        { idConsulta: "invalida", fechaInicio: "2026-05-15" },
      ];
      expect(ConsultaService.filtrarConsultas(lista, { desde: "2026-05-15" })
        .map((c) => c.idConsulta)).to.deep.equal(["valida"]);
    });

    it("sin filtros conserva las consultas recibidas", () => {
      expect(ConsultaService.filtrarConsultas(consultas)).to.deep.equal(consultas);
    });
  });

  describe("buscarConsultas", () => {
    it("sin idPersonaRol no consulta el servicio", async () => {
      const service = new ConsultaService();
      const stub = sinon.stub(service, "findRangeByPersonaRol");
      expect(await service.buscarConsultas({})).to.deep.equal([]);
      expect(stub.notCalled).to.equal(true);
    });

    it("obtiene la página y aplica los filtros solicitados", async () => {
      const service = new ConsultaService();
      const stub = sinon.stub(service, "findRangeByPersonaRol").resolves({
        registros: [
          { idConsulta: "a", clinica: "c1", fechaInicio: new Date(2026, 4, 15) },
          { idConsulta: "b", clinica: "c2", fechaInicio: new Date(2026, 4, 15) },
        ],
      });

      const resultado = await service.buscarConsultas({
        idPersonaRol: "rol-1",
        idClinica: "c1",
      });

      expect(stub.calledOnceWithExactly("rol-1", 0, 50)).to.equal(true);
      expect(resultado.map((c) => c.idConsulta)).to.deep.equal(["a"]);
    });
  });
});
