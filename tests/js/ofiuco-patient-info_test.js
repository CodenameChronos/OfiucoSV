import { expect } from "chai";
import "../../src/js/components/avatar/ofiuco-avatar.js";
import "../../src/js/components/patient-info/ofiuco-patient-info.js";
import { mount, unmountAll } from "../helpers.js";

describe("<ofiuco-avatar>", () => {
  afterEach(unmountAll);

  const caja = (el) => el.shadowRoot.querySelector(".avatar");

  it('es una imagen con texto alternativo "Sin fotografía" por defecto', () => {
    const el = mount("ofiuco-avatar");

    expect(caja(el).getAttribute("role")).to.equal("img");
    expect(caja(el).getAttribute("aria-label")).to.equal("Sin fotografía");
  });

  it("usa y actualiza el atributo label", () => {
    const el = mount("ofiuco-avatar", { label: "Paciente" });
    expect(caja(el).getAttribute("aria-label")).to.equal("Paciente");

    el.setAttribute("label", "Otro");
    expect(caja(el).getAttribute("aria-label")).to.equal("Otro");
  });

  it("dibuja la silueta genérica", () => {
    const icono = caja(mount("ofiuco-avatar")).querySelector("ofiuco-icon");

    expect(icono.getAttribute("name")).to.equal("user");
  });
});

describe("<ofiuco-patient-info>", () => {
  afterEach(unmountAll);

  const q = (el, selector) => el.shadowRoot.querySelector(selector);
  const infos = (el) => el.shadowRoot.querySelectorAll("ofiuco-simple-info");

  it("incluye la foto genérica, el nombre, la edad y el ID", () => {
    const el = mount("ofiuco-patient-info");

    expect(q(el, "ofiuco-avatar")).to.not.equal(null);
    expect(q(el, ".nombre")).to.not.equal(null);
    expect(infos(el)).to.have.length(2);
  });

  it("muestra los datos del paciente", () => {
    const el = mount("ofiuco-patient-info");

    el.model = {
      nombreCompleto: "Susana Del Carmen",
      edad: 20,
      idPersona: "1254as-jasd",
    };

    expect(q(el, ".nombre").textContent).to.equal("Susana Del Carmen");
    expect(infos(el)[0].getAttribute("valor")).to.equal("20 años");
    expect(infos(el)[1].getAttribute("valor")).to.equal("1254as-jasd");
  });

  it('usa el singular "1 año"', () => {
    const el = mount("ofiuco-patient-info");

    el.model = { nombreCompleto: "Bebé", edad: 1, idPersona: "x" };

    expect(infos(el)[0].getAttribute("valor")).to.equal("1 año");
  });

  it('muestra "No registrada" si la edad no se puede calcular', () => {
    const el = mount("ofiuco-patient-info");

    el.model = { nombreCompleto: "Sin fecha", edad: null, idPersona: "x" };

    expect(infos(el)[0].getAttribute("valor")).to.equal("No registrada");
  });

  it("el cero se muestra como edad válida", () => {
    const el = mount("ofiuco-patient-info");

    el.model = { nombreCompleto: "Recién nacido", edad: 0, idPersona: "x" };

    expect(infos(el)[0].getAttribute("valor")).to.equal("0 años");
  });

  it("se actualiza al cambiar el modelo y se limpia con null", () => {
    const el = mount("ofiuco-patient-info");
    el.model = { nombreCompleto: "A", edad: 30, idPersona: "1" };

    el.model = null;

    expect(q(el, ".nombre").textContent).to.equal("");
    expect(infos(el)[1].getAttribute("valor")).to.equal("");
  });

  it("inserta el nombre como texto, nunca como HTML", () => {
    const el = mount("ofiuco-patient-info");

    el.model = {
      nombreCompleto: "<img src=x onerror=alert(1)>",
      edad: 5,
      idPersona: "1",
    };

    expect(q(el, ".nombre img")).to.equal(null);
  });

  it("acepta un modelo asignado antes de montarse", () => {
    const el = document.createElement("ofiuco-patient-info");
    el.model = { nombreCompleto: "Previo", edad: 40, idPersona: "9" };

    document.querySelector("#fixture").append(el);

    expect(q(el, ".nombre").textContent).to.equal("Previo");
  });
});
