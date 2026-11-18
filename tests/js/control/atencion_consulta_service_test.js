/**
 * Pruebas de AtencionService y ConfirmacionRequerida.
 *
 * Se limitan a comportamiento verificable sin conocer el backend: los
 * "guards" de carga, la propagación de errores del loader y la delegación
 * del método `finalizar`. Los repositorios se simulan con Sinon
 * inyectándolos por la opción `fabrica`.
 */
import * as chai from "../lib/chai/index.js";
import sinon from "../lib/sinon/sinon-esm.js";
import AtencionService, {
  ConfirmacionRequerida,
} from "@service/atencion_consulta_service.js";

const { expect } = chai;

/** Devuelve el error con el que se rechaza la promesa; falla si se resuelve. */
async function rechaza(promesa) {
  try {
    await promesa;
  } catch (error) {
    return error;
  }
  throw new Error("Se esperaba que la promesa fuera rechazada");
}

const MENSAJE_SIN_CARGA = "Primero hay que llamar a cargar()";

suite("AtencionService · ConfirmacionRequerida", () => {
  test("es un Error con nombre propio", () => {
    const error = new ConfirmacionRequerida("¿Seguro?");
    expect(error).to.be.instanceOf(Error);
    expect(error.name).to.equal("ConfirmacionRequerida");
    expect(error.message).to.equal("¿Seguro?");
  });

  test("por defecto usa el mensaje como único aviso", () => {
    expect(new ConfirmacionRequerida("Aviso único").avisos).to.deep.equal([
      "Aviso único",
    ]);
  });

  test("conserva la lista de avisos recibida", () => {
    const error = new ConfirmacionRequerida("Texto completo", ["uno", "dos"]);
    expect(error.avisos).to.deep.equal(["uno", "dos"]);
  });
});

suite("AtencionService · antes de cargar()", () => {
  let servicio;

  setup(() => {
    servicio = new AtencionService();
  });

  test("advertencias exige haber cargado la consulta", () => {
    expect(() => servicio.advertencias({})).to.throw(MENSAJE_SIN_CARGA);
  });

  test("seleccionarProcedimiento exige haber cargado la consulta", async () => {
    const error = await rechaza(servicio.seleccionarProcedimiento("cp-1"));
    expect(error.message).to.equal(MENSAJE_SIN_CARGA);
  });

  test("guardarCambios exige haber cargado la consulta", async () => {
    const error = await rechaza(servicio.guardarCambios({}));
    expect(error.message).to.equal(MENSAJE_SIN_CARGA);
  });

  test("avanzar exige haber cargado la consulta", async () => {
    const error = await rechaza(servicio.avanzar({}));
    expect(error.message).to.equal(MENSAJE_SIN_CARGA);
  });

  test("retroceder exige haber cargado la consulta", async () => {
    const error = await rechaza(servicio.retroceder({}));
    expect(error.message).to.equal(MENSAJE_SIN_CARGA);
  });

  test("finalizarProcedimiento exige haber cargado la consulta", async () => {
    const error = await rechaza(servicio.finalizarProcedimiento({}));
    expect(error.message).to.equal(MENSAJE_SIN_CARGA);
  });

  test("finalizarConsulta exige haber cargado la consulta", async () => {
    const error = await rechaza(servicio.finalizarConsulta());
    expect(error.message).to.equal(MENSAJE_SIN_CARGA);
  });
});

suite("AtencionService · cargar() con repositorios simulados", () => {
  let sandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  test("consulta al servicio con los ids recibidos", async () => {
    const findById = sandbox.stub().resolves({});
    const findAll = sandbox.stub().resolves([]);
    const fabrica = {
      consulta: sandbox.stub().returns({ findById }),
      consultaProcedimiento: sandbox.stub().returns({ findAll }),
    };

    const servicio = new AtencionService({ fabrica });
    await rechaza(servicio.cargar({ idPersonaRol: "pr-1", idConsulta: "c-1" }));

    expect(fabrica.consulta.calledOnceWithExactly("pr-1")).to.be.true;
    expect(findById.calledOnceWithExactly("c-1")).to.be.true;
    expect(fabrica.consultaProcedimiento.calledOnceWithExactly("c-1")).to.be
      .true;
  });

  test("rechaza si la consulta no tiene procedimientos", async () => {
    const fabrica = {
      consulta: sandbox
        .stub()
        .returns({ findById: sandbox.stub().resolves({}) }),
      consultaProcedimiento: sandbox
        .stub()
        .returns({ findAll: sandbox.stub().resolves([]) }),
    };

    const servicio = new AtencionService({ fabrica });
    const error = await rechaza(
      servicio.cargar({ idPersonaRol: "pr-1", idConsulta: "c-1" }),
    );

    expect(error.message).to.equal(
      "La consulta no tiene procedimientos asociados",
    );
  });

  test("propaga los errores del repositorio", async () => {
    const fabrica = {
      consulta: sandbox.stub().returns({
        findById: sandbox.stub().rejects(new Error("sin conexión")),
      }),
    };

    const servicio = new AtencionService({ fabrica });
    const error = await rechaza(
      servicio.cargar({ idPersonaRol: "pr-1", idConsulta: "c-1" }),
    );

    expect(error.message).to.equal("sin conexión");
  });

  test("si cargar() falla, el servicio sigue sin estar cargado", async () => {
    const fabrica = {
      consulta: sandbox.stub().returns({
        findById: sandbox.stub().rejects(new Error("falló")),
      }),
    };

    const servicio = new AtencionService({ fabrica });
    await rechaza(servicio.cargar({ idPersonaRol: "pr-1", idConsulta: "c-1" }));

    expect(() => servicio.advertencias({})).to.throw(MENSAJE_SIN_CARGA);
  });
});

suite("AtencionService · finalizar ", () => {
  let sandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  test("delega en finalizarProcedimiento con los mismos argumentos", async () => {
    const espiado = sandbox
      .stub(AtencionService.prototype, "finalizarProcedimiento")
      .resolves("vista-final");

    const servicio = new AtencionService();
    const borrador = { notas: "x" };
    const opciones = { confirmado: true };

    const resultado = await servicio.finalizar(borrador, opciones);

    expect(resultado).to.equal("vista-final");
    expect(espiado.calledOnceWithExactly(borrador, opciones)).to.be.true;
  });
});
