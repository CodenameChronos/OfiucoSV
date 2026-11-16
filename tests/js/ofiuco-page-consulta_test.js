import * as chai from "../../lib/chai/index.js";
import "../../src/js/boundary/ofiuco-page-consulta.js";
import { ConsultaEventos } from "../../src/js/boundary/core/eventos-consulta.js";
import { AtencionServiceFalso } from "./control/atencion_service_falso.js";
import { mount, unmountAll } from "../helpers.js";

const CONTEXTO = { idPersonaRol: "pr-1", idConsulta: "c-1" };
const OTRA = { id: "BBB-2", resultado: { resultado: "", interpretacion: "" } };

const esperar = (ms = 0) => new Promise((resolver) => setTimeout(resolver, ms));

describe("<ofiuco-page-consulta>", () => {
  let pagina;
  const escuchas = [];

  const escuchar = (nombre) => {
    const spy = sinon.spy();
    document.addEventListener(nombre, spy);
    escuchas.push([nombre, spy]);
    return spy;
  };

  afterEach(() => {
    unmountAll();
    escuchas.splice(0).forEach(([n, s]) => document.removeEventListener(n, s));
  });

  // ------------------------------------------------------------ utilidades
  const q = (selector) => pagina.shadowRoot.querySelector(selector);
  const dentro = (host, selector) => host.shadowRoot.querySelector(selector);
  const boton = (host) => dentro(host, "button");
  const clic = (host) => boton(host).click();

  const escribir = (host, texto) => {
    const area = dentro(host, "textarea");
    area.value = texto;
    area.dispatchEvent(new Event("input"));
  };

  const emitir = (host, nombre, detail) =>
    host.dispatchEvent(
      new CustomEvent(nombre, { detail, bubbles: true, composed: true }),
    );

  const dialogo = () => dentro(q("ofiuco-confirm-dialog"), "dialog");
  const esperarDialogo = async () => {
    for (let i = 0; i < 50 && !dialogo().open; i += 1) await esperar(0);
    expect(dialogo().open, "el diálogo no se abrió").to.equal(true);
  };
  const responder = async (acepta) => {
    await esperarDialogo();
    const accion = dentro(
      q("ofiuco-confirm-dialog"),
      `[data-accion="${acepta ? "aceptar" : "cancelar"}"]`,
    );
    clic(accion);
  };

  const toasts = () => [
    ...dentro(q("ofiuco-toast"), ".toasts").querySelectorAll(".toast"),
  ];

  async function montar(servicio, contexto = CONTEXTO) {
    pagina = mount("ofiuco-page-consulta");
    pagina.servicio = servicio;
    pagina.contexto = contexto;
    await pagina.terminado;
    return pagina;
  }

  const notas = () => q('[data-campo="notas"]');
  const guardar = () => q("ofiuco-save-button");
  const resultados = () => q("ofiuco-exam-results");
  const asignador = () => q("ofiuco-exam-assigner");
  const stepper = () => q("ofiuco-stepper");
  const siguiente = () => dentro(stepper(), "ofiuco-next-button");
  const anterior = () => dentro(stepper(), "ofiuco-previous-button");

  // ------------------------------------------------------------ carga
  describe("carga", () => {
    it("antes de tener contexto no muestra nada", () => {
      pagina = mount("ofiuco-page-consulta");

      expect(q(".estado").hidden).to.equal(true);
      expect(q(".consulta").hidden).to.equal(true);
    });

    it("carga con el contexto recibido", async () => {
      const servicio = new AtencionServiceFalso();

      await montar(servicio);

      expect(servicio.llamadas[0]).to.deep.include({ nombre: "cargar" });
      expect(servicio.llamadas[0].ids).to.deep.equal({
        idPersonaRol: "pr-1",
        idConsulta: "c-1",
      });
    });

    it("muestra 'Cargando' mientras espera y luego la consulta", async () => {
      const servicio = new AtencionServiceFalso();
      const liberar = servicio.pausar();
      pagina = mount("ofiuco-page-consulta");
      pagina.servicio = servicio;

      pagina.contexto = CONTEXTO;

      expect(q(".estado").textContent).to.contain("Cargando");
      expect(q(".consulta").hidden).to.equal(true);
      liberar();
      await pagina.terminado;
      expect(q(".estado").hidden).to.equal(true);
      expect(q(".consulta").hidden).to.equal(false);
    });

    it("también carga si el contexto se asignó antes de conectarse", async () => {
      const servicio = new AtencionServiceFalso();
      pagina = document.createElement("ofiuco-page-consulta");
      pagina.servicio = servicio;
      pagina.contexto = CONTEXTO;

      document.querySelector("#fixture").append(pagina);
      await pagina.terminado;

      expect(q(".consulta").hidden).to.equal(false);
    });

    it("muestra el paciente, el paso, las notas y la referencia", async () => {
      const servicio = new AtencionServiceFalso();
      await montar(servicio);

      expect(q("ofiuco-patient-info").model.nombreCompleto).to.equal(
        "Susana Del Carmen",
      );
      expect(q(".titulo").textContent).to.equal("Paso 1 del procedimiento");
      expect(notas().value).to.equal("");
      expect(stepper().model.numero).to.equal(1);
      expect(stepper().model.total).to.equal(3);
    });

    it("un error de carga muestra el mensaje y permite reintentar", async () => {
      const servicio = new AtencionServiceFalso();
      servicio.proximoError = new Error("La consulta no existe");

      await montar(servicio);

      expect(q(".estado").textContent).to.contain("La consulta no existe");
      expect(q(".consulta").hidden).to.equal(true);
      expect(q(".pagina > ofiuco-button").hidden).to.equal(false);

      clic(q(".pagina > ofiuco-button"));
      await pagina.terminado;

      expect(q(".consulta").hidden).to.equal(false);
      expect(q(".estado").hidden).to.equal(true);
    });

    it("una carga vieja no pisa a una más nueva", async () => {
      const servicio = new AtencionServiceFalso();
      pagina = mount("ofiuco-page-consulta");
      pagina.servicio = servicio;
      const liberar = servicio.pausar();
      pagina.contexto = CONTEXTO;
      const primera = pagina.terminado;

      liberar();
      pagina.contexto = { idPersonaRol: "pr-2", idConsulta: "c-2" };
      await Promise.all([primera, pagina.terminado]);

      const cargas = servicio.llamadas.filter((l) => l.nombre === "cargar");
      expect(cargas).to.have.length(2);
      expect(q(".consulta").hidden).to.equal(false);
    });
  });

  // ------------------------------------------------------------ guardar
  describe("guardar cambios", () => {
    it("Guardar está deshabilitado mientras no haya cambios", async () => {
      await montar(new AtencionServiceFalso());

      expect(guardar().disabled).to.equal(true);
    });

    it("escribir en Observaciones habilita Guardar", async () => {
      await montar(new AtencionServiceFalso());

      escribir(notas(), "Paciente estable");

      expect(guardar().disabled).to.equal(false);
    });

    it("escribir en la referencia externa también habilita Guardar", async () => {
      await montar(new AtencionServiceFalso());

      escribir(q('[data-campo="referencia"]'), "REF-77");

      expect(guardar().disabled).to.equal(false);
    });

    it("guardar envía el borrador, avisa y vuelve a deshabilitar Guardar", async () => {
      const servicio = new AtencionServiceFalso();
      await montar(servicio);
      escribir(notas(), "Paciente estable");

      clic(guardar());
      await pagina.terminado;

      const llamada = servicio.llamadas.at(-1);
      expect(llamada.nombre).to.equal("guardarCambios");
      expect(llamada.borrador.notas).to.equal("Paciente estable");
      expect(toasts()).to.have.length(1);
      expect(toasts()[0].textContent).to.contain("Cambios guardados");
      expect(toasts()[0].classList.contains("toast--exito")).to.equal(true);
      expect(guardar().disabled).to.equal(true);
    });

    it("mientras guarda bloquea Guardar, el stepper y la edición", async () => {
      const servicio = new AtencionServiceFalso();
      await montar(servicio);
      escribir(notas(), "x");
      const liberar = servicio.pausar();

      clic(guardar());

      expect(guardar().disabled).to.equal(true);
      expect(stepper().hasAttribute("busy")).to.equal(true);
      expect(notas().hasAttribute("readonly")).to.equal(true);
      liberar();
      await pagina.terminado;
      expect(stepper().hasAttribute("busy")).to.equal(false);
      expect(notas().hasAttribute("readonly")).to.equal(false);
    });

    it("un segundo clic mientras guarda no duplica la llamada", async () => {
      const servicio = new AtencionServiceFalso();
      await montar(servicio);
      escribir(notas(), "x");
      const liberar = servicio.pausar();

      clic(guardar());
      emitir(guardar(), ConsultaEventos.GUARDAR);
      liberar();
      await pagina.terminado;

      expect(
        servicio.llamadas.filter((l) => l.nombre === "guardarCambios"),
      ).to.have.length(1);
    });

    it("un error del servicio se muestra y conserva el borrador", async () => {
      const servicio = new AtencionServiceFalso();
      await montar(servicio);
      escribir(notas(), "Texto importante");
      servicio.proximoError = new Error("Fallo de red");

      clic(guardar());
      await pagina.terminado;

      expect(toasts()).to.have.length(1);
      expect(toasts()[0].textContent).to.contain("Fallo de red");
      expect(toasts()[0].getAttribute("role")).to.equal("alert");
      expect(notas().value).to.equal("Texto importante");
      expect(guardar().disabled).to.equal(false);
    });

    it("un error sin mensaje muestra un texto genérico", async () => {
      const servicio = new AtencionServiceFalso();
      await montar(servicio);
      escribir(notas(), "x");
      servicio.proximoError = {};

      clic(guardar());
      await pagina.terminado;

      expect(toasts()[0].textContent).to.contain("error inesperado");
    });
  });

  // ------------------------------------------------------------ confirmación
  describe("confirmación del servicio", () => {
    it("muestra los avisos y, al aceptar, repite con confirmado", async () => {
      const servicio = new AtencionServiceFalso();
      servicio.avisosPendientes = ["Se perderán resultados."];
      await montar(servicio);
      escribir(notas(), "x");

      clic(guardar());
      await esperarDialogo();
      const items = [
        ...dentro(
          q("ofiuco-confirm-dialog"),
          ".dialogo__avisos",
        ).querySelectorAll("li"),
      ];
      expect(items.map((li) => li.textContent)).to.deep.equal([
        "Se perderán resultados.",
      ]);
      await responder(true);
      await pagina.terminado;

      const escrituras = servicio.llamadas.filter(
        (l) => l.nombre === "guardarCambios",
      );
      expect(escrituras).to.have.length(2);
      expect(escrituras[0].opciones).to.deep.equal({});
      expect(escrituras[1].opciones).to.deep.equal({ confirmado: true });
      expect(toasts()[0].textContent).to.contain("Cambios guardados");
    });

    it("al cancelar no repite la llamada y conserva el borrador", async () => {
      const servicio = new AtencionServiceFalso();
      servicio.avisosPendientes = ["Se perderán resultados."];
      await montar(servicio);
      escribir(notas(), "x");

      clic(guardar());
      await responder(false);
      await pagina.terminado;

      expect(
        servicio.llamadas.filter((l) => l.nombre === "guardarCambios"),
      ).to.have.length(1);
      expect(toasts()).to.have.length(0);
      expect(notas().value).to.equal("x");
      expect(guardar().disabled).to.equal(false);
    });
  });

  // ------------------------------------------------------------ exámenes
  describe("exámenes", () => {
    it("agregar un examen lo deja en el panel derecho pero NO en la lista de resultados", async () => {
      await montar(new AtencionServiceFalso());

      emitir(asignador(), ConsultaEventos.EXAMEN_AGREGADO, { id: "AAA-1" });

      expect(asignador().model.seleccion).to.deep.equal(["aaa-1"]);
      expect(resultados().model.items).to.have.length(0);
      expect(resultados().model.pendientes).to.equal(1);
      expect(guardar().disabled).to.equal(false);
    });

    it("tras guardar, el examen aparece en la lista de resultados y queda seleccionado", async () => {
      const servicio = new AtencionServiceFalso();
      await montar(servicio);
      emitir(asignador(), ConsultaEventos.EXAMEN_AGREGADO, { id: "AAA-1" });

      clic(guardar());
      await pagina.terminado;

      expect(resultados().model.items.map((i) => i.id)).to.deep.equal([
        "aaa-1",
      ]);
      expect(resultados().model.seleccionado).to.equal("aaa-1");
      expect(resultados().model.pendientes).to.equal(0);
      expect(servicio.llamadas.at(-1).borrador.examenes).to.deep.equal([
        "aaa-1",
      ]);
    });

    it("al cargar con órdenes existentes selecciona la primera", async () => {
      await montar(
        new AtencionServiceFalso({ ordenes: [{ id: "AAA-1" }, OTRA] }),
      );

      expect(resultados().model.items.map((i) => i.id)).to.deep.equal([
        "aaa-1",
        "bbb-2",
      ]);
      expect(resultados().model.seleccionado).to.equal("aaa-1");
    });

    it("seleccionar otro examen cambia el modelo de resultados", async () => {
      await montar(
        new AtencionServiceFalso({ ordenes: [{ id: "AAA-1" }, OTRA] }),
      );

      emitir(resultados(), ConsultaEventos.EXAMEN_SELECCIONADO, {
        id: "bbb-2",
      });

      expect(resultados().model.seleccionado).to.equal("bbb-2");
    });

    it("quitar un examen ordenado lo marca 'quitando' hasta guardar y luego desaparece", async () => {
      const servicio = new AtencionServiceFalso({
        ordenes: [{ id: "AAA-1" }, OTRA],
      });
      await montar(servicio);

      emitir(asignador(), ConsultaEventos.QUITAR_EXAMEN, { value: "bbb-2" });
      expect(
        resultados().model.items.find((i) => i.id === "bbb-2").quitando,
      ).to.equal(true);

      clic(guardar());
      await pagina.terminado;

      expect(resultados().model.items.map((i) => i.id)).to.deep.equal([
        "aaa-1",
      ]);
    });

    it("si se quita el examen seleccionado, la selección pasa al que ocupa su lugar", async () => {
      const servicio = new AtencionServiceFalso({
        ordenes: [{ id: "AAA-1" }, { id: "BBB-2" }, { id: "CCC-3" }],
      });
      await montar(servicio);
      emitir(resultados(), ConsultaEventos.EXAMEN_SELECCIONADO, {
        id: "bbb-2",
      });

      emitir(asignador(), ConsultaEventos.QUITAR_EXAMEN, { value: "bbb-2" });
      clic(guardar());
      await pagina.terminado;

      expect(resultados().model.items.map((i) => i.id)).to.deep.equal([
        "aaa-1",
        "ccc-3",
      ]);
      expect(resultados().model.seleccionado).to.equal("ccc-3");
    });

    it("si se quitan todos, la lista queda vacía y sin selección", async () => {
      await montar(new AtencionServiceFalso({ ordenes: [{ id: "AAA-1" }] }));

      emitir(asignador(), ConsultaEventos.QUITAR_EXAMEN, { value: "aaa-1" });
      clic(guardar());
      await pagina.terminado;

      expect(resultados().model.items).to.have.length(0);
      expect(resultados().model.seleccionado).to.equal(null);
    });

    it("escribir un resultado lo envía al guardar y se conserva en el modelo", async () => {
      const servicio = new AtencionServiceFalso({ ordenes: [{ id: "AAA-1" }] });
      await montar(servicio);

      emitir(resultados(), ConsultaEventos.RESULTADO_CAMBIADO, {
        id: "aaa-1",
        campo: "resultado",
        valor: "plaquetas bajas",
      });
      emitir(resultados(), ConsultaEventos.RESULTADO_CAMBIADO, {
        id: "aaa-1",
        campo: "interpretacion",
        valor: "Hay que repetir el examen",
      });
      expect(guardar().disabled).to.equal(false);
      clic(guardar());
      await pagina.terminado;

      expect(
        servicio.llamadas.at(-1).borrador.resultados["aaa-1"],
      ).to.deep.equal({
        resultado: "plaquetas bajas",
        interpretacion: "Hay que repetir el examen",
      });
      expect(resultados().model.valores["aaa-1"].resultado).to.equal(
        "plaquetas bajas",
      );
      expect(resultados().model.items[0].tieneResultado).to.equal(true);
    });

    it("el texto de un examen se conserva al cambiar la selección", async () => {
      await montar(
        new AtencionServiceFalso({ ordenes: [{ id: "AAA-1" }, OTRA] }),
      );
      emitir(resultados(), ConsultaEventos.RESULTADO_CAMBIADO, {
        id: "aaa-1",
        campo: "resultado",
        valor: "PA 140/90",
      });

      emitir(resultados(), ConsultaEventos.EXAMEN_SELECCIONADO, {
        id: "bbb-2",
      });
      emitir(resultados(), ConsultaEventos.EXAMEN_SELECCIONADO, {
        id: "aaa-1",
      });

      expect(resultados().model.valores["aaa-1"].resultado).to.equal(
        "PA 140/90",
      );
    });
  });

  // ------------------------------------------------------------ pasos
  describe("avanzar y retroceder", () => {
    it("en el primer paso Anterior está deshabilitado y Avanzar habilitado", async () => {
      await montar(new AtencionServiceFalso());

      expect(anterior().disabled).to.equal(true);
      expect(siguiente().disabled).to.equal(false);
    });

    it("Avanzar guarda el borrador, cambia de paso y lleva el foco al título", async () => {
      const servicio = new AtencionServiceFalso();
      await montar(servicio);
      escribir(notas(), "Notas del paso 1");

      clic(siguiente());
      await pagina.terminado;

      const llamada = servicio.llamadas.find((l) => l.nombre === "avanzar");
      expect(llamada.borrador.notas).to.equal("Notas del paso 1");
      expect(q(".titulo").textContent).to.equal("Paso 2 del procedimiento");
      expect(stepper().model.numero).to.equal(2);
      expect(notas().value).to.equal("");
      expect(pagina.shadowRoot.activeElement).to.equal(q(".titulo"));
    });

    it("Retroceder vuelve al paso anterior y conserva lo guardado en él", async () => {
      const servicio = new AtencionServiceFalso();
      await montar(servicio);
      escribir(notas(), "Notas del paso 1");
      clic(siguiente());
      await pagina.terminado;

      clic(anterior());
      await pagina.terminado;

      expect(q(".titulo").textContent).to.equal("Paso 1 del procedimiento");
      expect(notas().value).to.equal("Notas del paso 1");
      expect(servicio.llamadas.some((l) => l.nombre === "retroceder")).to.equal(
        true,
      );
    });

    it("en el último paso Avanzar queda deshabilitado", async () => {
      await montar(new AtencionServiceFalso({ pasoInicial: 2 }));

      expect(siguiente().disabled).to.equal(true);
      expect(anterior().disabled).to.equal(false);
    });

    it("Avanzar con confirmación pendiente pregunta antes de cambiar de paso", async () => {
      const servicio = new AtencionServiceFalso();
      servicio.avisosPendientes = ["Hay exámenes sin resultado."];
      await montar(servicio);

      clic(siguiente());
      await responder(false);
      await pagina.terminado;

      expect(q(".titulo").textContent).to.equal("Paso 1 del procedimiento");
    });

    it("un error al avanzar no cambia de paso ni pierde el borrador", async () => {
      const servicio = new AtencionServiceFalso();
      await montar(servicio);
      escribir(notas(), "x");
      servicio.proximoError = new Error("No se pudo avanzar");

      clic(siguiente());
      await pagina.terminado;

      expect(q(".titulo").textContent).to.equal("Paso 1 del procedimiento");
      expect(notas().value).to.equal("x");
      expect(toasts()[0].textContent).to.contain("No se pudo avanzar");
    });
  });

  // ------------------------------------------------------------ finalizar
  describe("finalizar consulta", () => {
    it("el botón solo aparece en el último paso", async () => {
      await montar(new AtencionServiceFalso());
      expect(q("ofiuco-end-button").hidden).to.equal(true);

      pagina.remove();
      await montar(new AtencionServiceFalso({ pasoInicial: 2 }));
      expect(q("ofiuco-end-button").hidden).to.equal(false);
    });

    it("pide confirmación y, al aceptar, finaliza y pasa a solo lectura", async () => {
      const servicio = new AtencionServiceFalso({
        pasoInicial: 2,
        ordenes: [{ id: "AAA-1" }],
      });
      await montar(servicio);

      clic(q("ofiuco-end-button"));
      await responder(true);
      await pagina.terminado;

      expect(servicio.llamadas.some((l) => l.nombre === "finalizar")).to.equal(
        true,
      );
      expect(toasts()[0].textContent).to.contain("Consulta finalizada");
      expect(guardar().hidden).to.equal(true);
      expect(q("ofiuco-end-button").hidden).to.equal(true);
      expect(notas().hasAttribute("readonly")).to.equal(true);
      expect(asignador().model.readonly).to.equal(true);
      expect(resultados().model.readonly).to.equal(true);
    });

    it("si se cancela la confirmación no finaliza", async () => {
      const servicio = new AtencionServiceFalso({ pasoInicial: 2 });
      await montar(servicio);

      clic(q("ofiuco-end-button"));
      await responder(false);
      await pagina.terminado;

      expect(servicio.llamadas.some((l) => l.nombre === "finalizar")).to.equal(
        false,
      );
      expect(guardar().hidden).to.equal(false);
    });
  });

  // ------------------------------------------------------------ solo lectura
  describe("consulta ya finalizada", () => {
    it("carga en solo lectura: sin guardar ni finalizar y con campos readonly", async () => {
      await montar(
        new AtencionServiceFalso({
          pasoInicial: 2,
          completa: true,
          ordenes: [{ id: "AAA-1" }],
        }),
      );

      expect(guardar().hidden).to.equal(true);
      expect(q("ofiuco-end-button").hidden).to.equal(true);
      expect(notas().hasAttribute("readonly")).to.equal(true);
      expect(q('[data-campo="referencia"]').hasAttribute("readonly")).to.equal(
        true,
      );
      expect(asignador().model.readonly).to.equal(true);
    });

    it("ignora las ediciones", async () => {
      const servicio = new AtencionServiceFalso({
        pasoInicial: 2,
        completa: true,
      });
      await montar(servicio);

      emitir(asignador(), ConsultaEventos.EXAMEN_AGREGADO, { id: "AAA-1" });

      expect(asignador().model.seleccion).to.deep.equal([]);
    });
  });

  // ------------------------------------------------------------ regresar
  describe("regresar al dashboard", () => {
    it("sin cambios emite SALIR directamente", async () => {
      const salir = escuchar(ConsultaEventos.SALIR);
      await montar(new AtencionServiceFalso());

      clic(q("ofiuco-return-button"));
      await pagina.terminado;

      expect(salir.calledOnce).to.equal(true);
      expect(salir.firstCall.args[0].detail).to.deep.equal({
        idConsulta: "c-1",
      });
    });

    it("con cambios pregunta y, si se cancela, no sale", async () => {
      const salir = escuchar(ConsultaEventos.SALIR);
      await montar(new AtencionServiceFalso());
      escribir(notas(), "x");

      clic(q("ofiuco-return-button"));
      await responder(false);
      await pagina.terminado;

      expect(salir.called).to.equal(false);
      expect(notas().value).to.equal("x");
    });

    it("con cambios y confirmación, descarta y sale", async () => {
      const salir = escuchar(ConsultaEventos.SALIR);
      await montar(new AtencionServiceFalso());
      escribir(notas(), "x");

      clic(q("ofiuco-return-button"));
      await responder(true);
      await pagina.terminado;

      expect(salir.calledOnce).to.equal(true);
    });
  });

  // ------------------------------------------------------------ encapsulación
  describe("encapsulación de eventos", () => {
    it("los eventos internos no se filtran fuera de la página", async () => {
      const espias = [
        ConsultaEventos.GUARDAR,
        ConsultaEventos.PASO_SIGUIENTE,
        ConsultaEventos.REGRESAR,
        ConsultaEventos.EXAMEN_AGREGADO,
        "value-changed",
        "ofiuco:button-click",
      ].map(escuchar);
      const servicio = new AtencionServiceFalso();
      await montar(servicio);
      escribir(notas(), "x");
      emitir(asignador(), ConsultaEventos.EXAMEN_AGREGADO, { id: "AAA-1" });

      clic(guardar());
      await pagina.terminado;
      clic(siguiente());
      await pagina.terminado;
      clic(q("ofiuco-return-button"));
      await pagina.terminado;

      espias.forEach((spy) => expect(spy.called).to.equal(false));
    });
  });
});
