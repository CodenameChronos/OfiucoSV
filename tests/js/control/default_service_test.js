import * as chai from "../lib/chai/index.js";
import sinon from "../lib/sinon/sinon-esm.js";
import DefaultService from "../../../src/js/control/default_service.js"; // Ajusta la ruta según tu estructura
import DefaultError from "../../../src/js/entity/default_error.js";
import DefaultResponse from "../../../src/js/entity/default_response.js";

const { expect } = chai;

mocha.setup("tdd");

suite("DefaultService - Pruebas Unitarias", function () {
  let service;
  let stubFetch;

  setup(function () {
    service = new DefaultService();
  });

  teardown(function () {
    if (stubFetch) {
      stubFetch.restore();
      stubFetch = null;
    }
  });

  test("create() retorna el ID extraído del header Location cuando el status es 201", async function () {
    stubFetch = sinon.stub(window, "fetch").resolves(
      new Response(null, {
        status: 201,
        headers: { Location: "http://localhost:9080/resources/v1/abc-123" },
      }),
    );

    const resultado = await service.create({ nombre: "Prueba" });

    expect(resultado).to.equal("abc-123");
    expect(stubFetch.calledOnce).to.equal(true);
    expect(stubFetch.firstCall.args[1].method).to.equal("POST");
  });

  test("create() rechaza con DefaultError cuando el status no es 201", async function () {
    stubFetch = sinon
      .stub(window, "fetch")
      .resolves(new Response(null, { status: 400 }));

    try {
      await service.create({ nombre: "Prueba" });
      expect.fail("Debería haber lanzado una excepción");
    } catch (error) {
      expect(error).to.be.an.instanceOf(DefaultError);
      expect(error.error).to.equal(400);
      expect(error.mensaje).to.include("Error al crear el registro");
    }
  });

  test("findRange() retorna DefaultResponse con registros y total cuando el status es 200", async function () {
    const mockDatos = [{ id: 1 }, { id: 2 }];
    stubFetch = sinon.stub(window, "fetch").resolves(
      new Response(JSON.stringify(mockDatos), {
        status: 200,
        headers: { "Total-registros": "2" },
      }),
    );

    const resultado = await service.findRange(0, 10);

    expect(resultado).to.be.an.instanceOf(DefaultResponse);
    expect(resultado.registros).to.deep.equal(mockDatos);
    expect(resultado.totalRegistros).to.equal(2);
  });

  test("findAll() recorre las páginas y acumula todos los registros correctamente", async function () {
    const stubFindRange = sinon.stub(service, "findRange");

    stubFindRange.withArgs(0, 2).resolves({
      registros: [{ id: 1 }, { id: 2 }],
      totalRegistros: 3,
    });
    stubFindRange.withArgs(2, 2).resolves({
      registros: [{ id: 3 }],
      totalRegistros: 3,
    });

    const acumulado = await service.findAll(2);

    expect(acumulado).to.deep.equal([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(stubFindRange.calledTwice).to.equal(true);
  });

  test("findById() retorna el registro individual cuando el status es 200", async function () {
    const mockRegistro = { id: "uuid-1", nombre: "Test ID" };
    stubFetch = sinon
      .stub(window, "fetch")
      .resolves(new Response(JSON.stringify(mockRegistro), { status: 200 }));

    const resultado = await service.findById("uuid-1");

    expect(resultado).to.deep.equal(mockRegistro);
  });

  test("update() retorna true cuando la actualización responde con status 204", async function () {
    stubFetch = sinon
      .stub(window, "fetch")
      .resolves(new Response(null, { status: 204 }));

    const resultado = await service.update("uuid-1", { nombre: "Actualizado" });

    expect(resultado).to.equal(true);
    expect(stubFetch.firstCall.args[1].method).to.equal("PUT");
  });

  test("update() maneja conflicto (status 409) devolviendo el mensaje del texto de respuesta", async function () {
    stubFetch = sinon
      .stub(window, "fetch")
      .resolves(
        new Response("Conflicto de versión optimista", { status: 409 }),
      );

    try {
      await service.update("uuid-1", { nombre: "Actualizado" });
      expect.fail("Debería haber lanzado una excepción");
    } catch (error) {
      expect(error).to.be.an.instanceOf(DefaultError);
      expect(error.error).to.equal(409);
      expect(error.mensaje).to.equal("Conflicto de versión optimista");
    }
  });

  test("delete() retorna true cuando se elimina correctamente con status 204", async function () {
    stubFetch = sinon
      .stub(window, "fetch")
      .resolves(new Response(null, { status: 204 }));

    const resultado = await service.delete("uuid-1");

    expect(resultado).to.equal(true);
    expect(stubFetch.firstCall.args[1].method).to.equal("DELETE");
  });
});

mocha.run();
