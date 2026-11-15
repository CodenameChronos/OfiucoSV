import * as chai from "./lib/chai/index.js";
import sinon from "./lib/sinon/sinon-esm.js";
import Consulta from "../../src/js/entity/consulta.js";
import Clinica from "../../src/js/entity/Clinica.js";
import ClinicaService from "../../src/js/control/clinica_service.js";
import ConsultaService from "../../src/js/control/consulta_service.js";
import "../../src/js/boundary/components/functional/tarjeta-cita.js";
import "../../src/js/boundary/components/functional/busqueda-citas.js";

const { expect } = chai;

mocha.setup("tdd");

suite("HU1 - Entity: Consulta y Clinica", function () {
  test("parsearObservaciones extrae pares titulo/descripcion de texto multilínea", function () {
    const texto = [
      "Toma de signos vitales",
      "Presión arterial 120/80 mmHg y temperatura 36.7 °C",
      "Evaluación de reflejos",
      "Reflejos osteotendinosos simétricos sin alteraciones",
    ].join("\n");

    const pasos = Consulta.parsearObservaciones(texto);

    expect(pasos).to.have.lengthOf(2);
    expect(pasos[0]).to.deep.equal({
      titulo: "Toma de signos vitales",
      descripcion: "Presión arterial 120/80 mmHg y temperatura 36.7 °C",
    });
    expect(pasos[1]).to.deep.equal({
      titulo: "Evaluación de reflejos",
      descripcion: "Reflejos osteotendinosos simétricos sin alteraciones",
    });
  });

  test("parsearObservaciones devuelve arreglo vacío cuando observaciones es nulo o vacío", function () {
    expect(Consulta.parsearObservaciones(null)).to.deep.equal([]);
    expect(Consulta.parsearObservaciones("   ")).to.deep.equal([]);
  });

  test("Consulta.desdeJson hidrata fechas, clínica, pasos y calcula pendiente", function () {
    const json = {
      idConsulta: "12345678-aaaa-bbbb-cccc-000000000001",
      fechaInicio: "2026-04-28T09:00:00",
      fechaFin: null,
      referenciaExterna: "REF-001",
      observaciones: "Anamnesis\nRevisión general del paciente",
      idPersonaRol: {
        idPersonaRol: "99999999-1111-2222-3333-444444444444",
        idClinica: {
          idClinica: "c1111111-1111-1111-1111-111111111111",
          nombreClinica: "Hospital San Juan de Dios",
        },
      },
    };

    const consulta = Consulta.desdeJson(json);

    expect(consulta).to.be.an.instanceOf(Consulta);
    expect(consulta.idCorto).to.equal("12345678");
    expect(consulta.pendiente).to.equal(true);
    expect(consulta.fechaInicio).to.be.an.instanceOf(Date);
    expect(consulta.clinica.nombreClinica).to.equal("Hospital San Juan de Dios");
    expect(consulta.pasos).to.have.lengthOf(1);
    expect(consulta.pasos[0].titulo).to.equal("Anamnesis");
  });

  test("Clinica.desdeJson hidrata idClinica y nombreClinica", function () {
    const clinica = Clinica.desdeJson({
      idClinica: "c1111111-1111-1111-1111-111111111111",
      nombreClinica: "Clínica Central",
      activo: true,
    });

    expect(clinica).to.be.an.instanceOf(Clinica);
    expect(clinica.idClinica).to.equal("c1111111-1111-1111-1111-111111111111");
    expect(clinica.nombreClinica).to.equal("Clínica Central");
  });
});

suite("HU1 - Control: ClinicaService y ConsultaService", function () {
  let stubFetch;

  teardown(function () {
    if (stubFetch) {
      stubFetch.restore();
      stubFetch = null;
    }
  });

  test("ClinicaService.findRange retorna DefaultResponse con instancias de Clinica", async function () {
    stubFetch = sinon.stub(window, "fetch").resolves(
      new Response(
        JSON.stringify([
          { idClinica: "1", nombreClinica: "Hospital San Juan de Dios" },
          { idClinica: "2", nombreClinica: "Unidad de Salud Santa Ana" },
        ]),
        { status: 200, headers: { "Total-registros": "2" } },
      ),
    );

    const service = new ClinicaService();
    const resp = await service.findRange(0, 10);

    expect(resp.totalRegistros).to.equal(2);
    expect(resp.registros).to.have.lengthOf(2);
    expect(resp.registros[0]).to.be.an.instanceOf(Clinica);
    expect(resp.registros[0].nombreClinica).to.equal("Hospital San Juan de Dios");
  });

  test("ConsultaService.findRangeByPersonaRol consulta /persona-rol/{id}/consulta", async function () {
    stubFetch = sinon.stub(window, "fetch").resolves(
      new Response(
        JSON.stringify([
          {
            idConsulta: "aaaa1111-0000-0000-0000-000000000001",
            fechaInicio: "2026-04-28T09:00:00",
            fechaFin: null,
            observaciones: "Toma de signos vitales\nControl rutinario",
          },
        ]),
        { status: 200, headers: { "Total-registros": "1" } },
      ),
    );

    const service = new ConsultaService();
    const idPersonaRol = "pr-1234";
    const resp = await service.findRangeByPersonaRol(idPersonaRol, 0, 10);

    expect(stubFetch.calledOnce).to.equal(true);
    expect(stubFetch.firstCall.args[0]).to.include(
      `persona-rol/${idPersonaRol}/consulta?first=0&max=10`,
    );
    expect(resp.registros).to.have.lengthOf(1);
    expect(resp.registros[0]).to.be.an.instanceOf(Consulta);
  });

  test("ConsultaService.filtrarConsultas filtra por clínica y rango de fechas", function () {
    const consultas = [
      Consulta.desdeJson({
        idConsulta: "1",
        fechaInicio: "2026-04-10T08:00:00",
        clinica: { idClinica: "c1", nombreClinica: "Clínica A" },
      }),
      Consulta.desdeJson({
        idConsulta: "2",
        fechaInicio: "2026-04-28T09:00:00",
        clinica: { idClinica: "c1", nombreClinica: "Clínica A" },
      }),
      Consulta.desdeJson({
        idConsulta: "3",
        fechaInicio: "2026-04-28T10:00:00",
        clinica: { idClinica: "c2", nombreClinica: "Clínica B" },
      }),
    ];

    const filtradas = ConsultaService.filtrarConsultas(consultas, {
      idClinica: "c1",
      desde: "2026-04-20",
      hasta: "2026-04-30",
    });

    expect(filtradas).to.have.lengthOf(1);
    expect(filtradas[0].idConsulta).to.equal("2");
  });
});

suite("HU1 - Boundary: <tarjeta-cita> y <busqueda-citas>", function () {
  let contenedor;

  setup(function () {
    contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
  });

  teardown(function () {
    contenedor.remove();
  });

  test("<tarjeta-cita> renderiza fecha, hora, clínica, pasos y emite descargar-ticket", function () {
    const consulta = Consulta.desdeJson({
      idConsulta: "c001",
      fechaInicio: new Date(2026, 3, 28, 9, 0, 0),
      fechaFin: null,
      clinica: { idClinica: "1", nombreClinica: "Hospital San Juan de Dios" },
      observaciones: [
        "Toma de signos vitales",
        "Presión y pulso normales",
        "Evaluación de reflejos",
        "Sin anomalías",
      ].join("\n"),
    });

    const tarjeta = document.createElement("tarjeta-cita");
    tarjeta.consulta = consulta;
    contenedor.appendChild(tarjeta);

    const shadow = tarjeta.shadowRoot;
    expect(shadow.querySelector(".cita-fecha").textContent).to.equal("28/04/2026");
    expect(shadow.querySelector(".cita-hora").textContent).to.equal("09:00 AM");
    expect(shadow.querySelector(".cita-clinica").textContent).to.equal(
      "Hospital San Juan de Dios",
    );

    const items = shadow.querySelectorAll(".procedimiento-item");
    expect(items).to.have.lengthOf(2);
    expect(items[0].querySelector(".procedimiento-titulo").textContent).to.equal(
      "Toma de signos vitales",
    );

    let eventoRecibido = null;
    tarjeta.addEventListener("descargar-ticket", (e) => {
      eventoRecibido = e.detail;
    });

    shadow.querySelector(".btn-ticket").click();
    expect(eventoRecibido).to.not.equal(null);
    expect(eventoRecibido.consulta.idConsulta).to.equal("c001");
  });

  test("<busqueda-citas> deshabilita N° Doc hasta elegir Tipo Doc y valida su formato", async function () {
    const mockTipoDocService = {
      findRange: sinon.stub().resolves({
        registros: [
          {
            idTipoDocumento: "td-dui",
            nombre: "DUI",
            expresionRegular: "^\\d{8}-\\d$",
          },
        ],
      }),
    };

    const mockClinicaService = {
      findRange: sinon.stub().resolves({
        registros: [
          { idClinica: "cl-1", nombreClinica: "Hospital San Juan de Dios" },
        ],
      }),
    };

    const mockConsultaService = {
      buscarConsultas: sinon.stub().resolves([
        Consulta.desdeJson({
          idConsulta: "cita-01",
          fechaInicio: new Date(2026, 3, 28, 9, 0, 0),
          clinica: { idClinica: "cl-1", nombreClinica: "Hospital San Juan de Dios" },
          observaciones: "Anamnesis\nConsulta inicial",
        }),
      ]),
    };

    const VistaBusqueda = customElements.get("busqueda-citas");
    const vista = new VistaBusqueda({
      tipoDocumentoService: mockTipoDocService,
      clinicaService: mockClinicaService,
      consultaService: mockConsultaService,
    });
    contenedor.appendChild(vista);

    await Promise.resolve();

    const shadow = vista.shadowRoot;
    const inputNumDoc = shadow.querySelector("input.campo-input");
    const autoCompletes = shadow.querySelectorAll("ofiuco-auto-complete");
    const acTipoDoc = autoCompletes[0];
    const acClinica = autoCompletes[1];

    expect(inputNumDoc.disabled).to.equal(true);

    acTipoDoc.dispatchEvent(
      new CustomEvent("option-selected", {
        detail: {
          option: {
            idTipoDocumento: "td-dui",
            nombre: "DUI",
            expresionRegular: "^\\d{8}-\\d$",
          },
        },
      }),
    );

    expect(inputNumDoc.disabled).to.equal(false);

    acClinica.dispatchEvent(
      new CustomEvent("option-selected", {
        detail: {
          option: {
            idClinica: "cl-1",
            nombreClinica: "Hospital San Juan de Dios",
          },
        },
      }),
    );

    // Formato inválido de DUI
    inputNumDoc.value = "123";
    await vista.buscar();
    expect(shadow.querySelector(".mensaje-estado.error").hidden).to.equal(false);
    expect(mockConsultaService.buscarConsultas.called).to.equal(false);

    // Formato válido de DUI
    inputNumDoc.value = "01234567-8";
    await vista.buscar();
    expect(mockConsultaService.buscarConsultas.calledOnce).to.equal(true);
    expect(shadow.querySelectorAll("tarjeta-cita")).to.have.lengthOf(1);
  });
});

mocha.run();