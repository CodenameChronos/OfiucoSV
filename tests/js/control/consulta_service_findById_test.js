import * as chai from "../lib/chai/index.js";
import sinon from "../lib/sinon/sinon-esm.js";
import ConsultaService from "../../../src/js/control/consulta_service.js";
import Consulta from "../../../src/js/entity/consulta.js";
import DefaultError from "../../../src/js/entity/default_error.js";

const { expect } = chai;

const ID_PERSONA_ROL = "11111111-1111-4111-8111-111111111111";
const ID_CONSULTA = "22222222-2222-4222-8222-222222222222";

describe("ConsultaService (consulta específica por persona-rol)", () => {
    let service;

    beforeEach(() => {
        service = new ConsultaService();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe("findById(uuid, idPersonaRol)", () => {
        it("obtiene la consulta y la convierte a una entidad Consulta", async () => {
            const datos = {
                idConsulta: ID_CONSULTA,
                fechaInicio: "2026-11-17T08:30:00",
                referenciaExterna: "DEMO-HU3-001",
                observaciones: "Consulta de prueba",
                idPersonaRol: ID_PERSONA_ROL,
            };

            const fetchStub = sinon.stub(window, "fetch").resolves(
                new Response(JSON.stringify(datos), { status: 200 }),
            );

            const resultado = await service.findById(
                ID_CONSULTA,
                ID_PERSONA_ROL,
            );

            expect(resultado).to.be.instanceOf(Consulta);
            expect(resultado.idConsulta).to.equal(ID_CONSULTA);
            expect(resultado.referenciaExterna).to.equal("DEMO-HU3-001");
            expect(resultado.observaciones).to.equal("Consulta de prueba");
            expect(resultado.fechaInicio).to.be.instanceOf(Date);

            expect(fetchStub.calledOnce).to.equal(true);
            expect(fetchStub.firstCall.args[0]).to.equal(
                `${service._BASE_URL}persona-rol/${ID_PERSONA_ROL}/consulta/${ID_CONSULTA}`,
            );
            expect(fetchStub.firstCall.args[1].method).to.equal("GET");
        });

        it("codifica los identificadores al construir la ruta", async () => {
            const fetchStub = sinon.stub(window, "fetch").resolves(
                new Response(JSON.stringify({ idConsulta: ID_CONSULTA }), {
                    status: 200,
                }),
            );

            await service.findById("consulta / 1", "rol / 1");

            expect(fetchStub.firstCall.args[0]).to.equal(
                `${service._BASE_URL}persona-rol/rol%20%2F%201/consulta/consulta%20%2F%201`,
            );
        });

        it("rechaza con DefaultError cuando el servidor responde con error HTTP", async () => {
            sinon.stub(window, "fetch").resolves(
                new Response(null, { status: 404 }),
            );

            const error = await service
                .findById(ID_CONSULTA, ID_PERSONA_ROL)
                .catch((e) => e);

            expect(error).to.be.instanceOf(DefaultError);
            expect(error.error).to.equal(404);
            expect(error.mensaje).to.include("Error al obtener el registro");
        });

        it("rechaza con DefaultError cuando falla la conexión", async () => {
            const causa = new Error("sin conexión");
            sinon.stub(window, "fetch").rejects(causa);

            const error = await service
                .findById(ID_CONSULTA, ID_PERSONA_ROL)
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
                .findById(ID_CONSULTA, ID_PERSONA_ROL)
                .catch((e) => e);

            expect(error).to.be.instanceOf(DefaultError);
            expect(error.mensaje).to.equal("Error al procesar respuesta");
        });
    });
});
