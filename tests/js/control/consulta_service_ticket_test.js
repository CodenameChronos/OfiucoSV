import * as chai from "../lib/chai/index.js";
import sinon from "../lib/sinon/sinon-esm.js";
import ConsultaService from "../../../src/js/control/consulta_service.js";
import DefaultError from "../../../src/js/entity/default_error.js";
import DefaultResponse from "../../../src/js/entity/default_response.js";
import Consulta from "../../../src/js/entity/consulta.js";

const { expect } = chai;
const ID_PERSONA_ROL = "11111111-1111-4111-8111-111111111111";
const ID_CONSULTA = "22222222-2222-4222-8222-222222222222";

describe("ConsultaService (paginación por persona-rol y ticket PDF)", () => {
  let service;

  beforeEach(() => {
    service = new ConsultaService();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("findRangeByPersonaRol", () => {
    it("devuelve DefaultResponse y convierte los registros a Consulta", async () => {
      const registros = [
        { idConsulta: "consulta-1", referenciaExterna: "REF-001" },
        { idConsulta: "consulta-2", referenciaExterna: "REF-002" },
      ];
      const fetchStub = sinon.stub(window, "fetch").resolves(
        new Response(JSON.stringify(registros), {
          status: 200,
          headers: { "Total-registros": "8" },
        }),
      );

      const respuesta = await service.findRangeByPersonaRol(ID_PERSONA_ROL, 10, 5);

      expect(respuesta).to.be.instanceOf(DefaultResponse);
      expect(respuesta.registros).to.have.length(2);
      expect(respuesta.registros[0]).to.be.instanceOf(Consulta);
      expect(respuesta.registros[0].idConsulta).to.equal("consulta-1");
      expect(respuesta.totalRegistros).to.equal(8);
      expect(fetchStub.firstCall.args[0]).to.equal(
        `${service._BASE_URL}persona-rol/${ID_PERSONA_ROL}/consulta?first=10&max=5`,
      );
      expect(fetchStub.firstCall.args[1].method).to.equal("GET");
    });

    it("usa la cantidad de registros cuando falta el encabezado Total-registros", async () => {
      sinon.stub(window, "fetch").resolves(
        new Response(JSON.stringify([{ idConsulta: "consulta-1" }]), {
          status: 200,
        }),
      );

      const respuesta = await service.findRangeByPersonaRol(ID_PERSONA_ROL);

      expect(respuesta.totalRegistros).to.equal(1);
      expect(respuesta.registros).to.have.length(1);
    });

    it("devuelve una lista vacía si el cuerpo no es un arreglo", async () => {
      sinon.stub(window, "fetch").resolves(
        new Response(JSON.stringify({ mensaje: "sin registros" }), { status: 200 }),
      );

      const respuesta = await service.findRangeByPersonaRol(ID_PERSONA_ROL);

      expect(respuesta.registros).to.deep.equal([]);
      expect(respuesta.totalRegistros).to.equal(0);
    });

    it("rechaza con DefaultError cuando el servidor responde con error HTTP", async () => {
      sinon.stub(window, "fetch").resolves(new Response(null, { status: 500 }));

      const error = await service
        .findRangeByPersonaRol(ID_PERSONA_ROL)
        .catch((e) => e);

      expect(error).to.be.instanceOf(DefaultError);
      expect(error.error).to.equal(500);
      expect(error.mensaje).to.include("Error al obtener consultas");
    });

    it("rechaza con DefaultError cuando falla la conexión", async () => {
      const causa = new Error("sin conexión");
      sinon.stub(window, "fetch").rejects(causa);

      const error = await service
        .findRangeByPersonaRol(ID_PERSONA_ROL)
        .catch((e) => e);

      expect(error).to.be.instanceOf(DefaultError);
      expect(error.error).to.equal(causa);
      expect(error.mensaje).to.equal("Error al acceder al repositorio");
    });

    it("rechaza con DefaultError cuando no puede procesar el JSON", async () => {
      sinon.stub(window, "fetch").resolves(
        new Response("json inválido", { status: 200 }),
      );

      const error = await service
        .findRangeByPersonaRol(ID_PERSONA_ROL)
        .catch((e) => e);

      expect(error).to.be.instanceOf(DefaultError);
      expect(error.mensaje).to.equal("Error al procesar respuesta");
    });
  });

  describe("descargarTicketPdf", () => {
    it("valida que ambos identificadores sean obligatorios", async () => {
      const fetchStub = sinon.stub(window, "fetch");

      const errorPersona = await service.descargarTicketPdf(null, ID_CONSULTA).catch((e) => e);
      const errorConsulta = await service.descargarTicketPdf(ID_PERSONA_ROL, "").catch((e) => e);

      expect(errorPersona).to.be.instanceOf(DefaultError);
      expect(errorConsulta).to.be.instanceOf(DefaultError);
      expect(errorPersona.mensaje).to.equal(
        "El identificador de persona-rol y de consulta son obligatorios",
      );
      expect(fetchStub.called).to.equal(false);
    });

    it("solicita el PDF, dispara su descarga y devuelve el Blob", async () => {
      const blob = new Blob(["contenido PDF"], { type: "application/pdf" });
      const enlace = {
        href: "",
        download: "",
        click: sinon.spy(),
        remove: sinon.spy(),
      };
      const fetchStub = sinon.stub(window, "fetch").resolves(
        new Response(blob, {
          status: 200,
          headers: {
            "Content-Disposition": 'attachment; filename="consulta.pdf"',
          },
        }),
      );
      sinon.stub(URL, "createObjectURL").returns("blob:ticket-prueba");
      sinon.stub(URL, "revokeObjectURL");
      sinon.stub(document, "createElement").withArgs("a").returns(enlace);
      sinon.stub(document.body, "appendChild").returns(enlace);

      const resultado = await service.descargarTicketPdf(ID_PERSONA_ROL, ID_CONSULTA);

      expect(resultado).to.be.instanceOf(Blob);
      expect(resultado.type).to.equal("application/pdf");
      expect(fetchStub.firstCall.args[0]).to.equal(
        `${service._BASE_URL}persona-rol/${ID_PERSONA_ROL}/consulta/${ID_CONSULTA}/ticket`,
      );
      expect(fetchStub.firstCall.args[1].method).to.equal("GET");
      expect(fetchStub.firstCall.args[1].headers.Accept).to.equal("application/pdf");
      expect(enlace.href).to.equal("blob:ticket-prueba");
      expect(enlace.download).to.equal("consulta.pdf");
      expect(enlace.click.calledOnce).to.equal(true);
      expect(enlace.remove.calledOnce).to.equal(true);
    });

    it("usa el nombre predeterminado cuando Content-Disposition no incluye nombre", async () => {
      const blob = new Blob(["pdf"], { type: "application/pdf" });
      const enlace = {
        href: "",
        download: "",
        click: sinon.spy(),
        remove: sinon.spy(),
      };
      sinon.stub(window, "fetch").resolves(new Response(blob, { status: 200 }));
      sinon.stub(URL, "createObjectURL").returns("blob:ticket-prueba");
      sinon.stub(URL, "revokeObjectURL");
      sinon.stub(document, "createElement").withArgs("a").returns(enlace);
      sinon.stub(document.body, "appendChild").returns(enlace);

      await service.descargarTicketPdf(ID_PERSONA_ROL, ID_CONSULTA);

      expect(enlace.download).to.equal(`ticket-cita-${ID_CONSULTA}.pdf`);
    });

    it("rechaza con DefaultError cuando el servidor no entrega el PDF", async () => {
      sinon.stub(window, "fetch").resolves(new Response(null, { status: 404 }));

      const error = await service
        .descargarTicketPdf(ID_PERSONA_ROL, ID_CONSULTA)
        .catch((e) => e);

      expect(error).to.be.instanceOf(DefaultError);
      expect(error.error).to.equal(404);
      expect(error.mensaje).to.include("Error al descargar el ticket PDF");
    });

    it("rechaza con DefaultError cuando falla la conexión al descargar", async () => {
      const causa = new Error("sin conexión");
      sinon.stub(window, "fetch").rejects(causa);

      const error = await service
        .descargarTicketPdf(ID_PERSONA_ROL, ID_CONSULTA)
        .catch((e) => e);

      expect(error).to.be.instanceOf(DefaultError);
      expect(error.error).to.equal(causa);
      expect(error.mensaje).to.equal("Error al acceder al repositorio");
    });
  });
});
