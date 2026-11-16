import * as chai from "../../lib/chai/index.js";
import "../../../../src/js/boundary/components/functional/ofiuco-button.js";
import "../../../../src/js/boundary/components/functional/ofiuco-save-button.js";
import "../../../../src/js/boundary/components/functional/ofiuco-next-button.js";
import "../../../../src/js/boundary/components/functional/ofiuco-previous-button.js";
import "../../../../src/js/boundary/components/functional/ofiuco-return-button.js";
import "../../../../src/js/boundary/components/functional/ofiuco-end-button.js";
import "../../../../src/js/boundary/components/functional/ofiuco-remove-exam-button.js";
import { ConsultaEventos } from "../../../../src/js/boundary/core/eventos-consulta.js";
import { BUTTON_CLICK } from "../../../../src/js/boundary/components/functional/ofiuco-button.js";
import { mount, unmountAll } from "../../../helpers.js";

const inner = (el) => el.shadowRoot.querySelector("button");
const text = (el) => el.shadowRoot.querySelector(".button__texto");
const iconOf = (el) => el.shadowRoot.querySelector("ofiuco-icon");

describe("<ofiuco-button>", () => {
  const spies = [];
  const listen = (name) => {
    const spy = sinon.spy();
    document.addEventListener(name, spy);
    spies.push([name, spy]);
    return spy;
  };

  afterEach(() => {
    unmountAll();
    spies.splice(0).forEach(([n, s]) => document.removeEventListener(n, s));
  });

  describe("base", () => {
    it("muestra la etiqueta", () => {
      const el = mount("ofiuco-button", { label: "Aceptar" });

      expect(text(el).textContent).to.equal("Aceptar");
      expect(text(el).hidden).to.equal(false);
    });

    it("muestra el ícono indicado y lo oculta si no hay", () => {
      const conIcono = mount("ofiuco-button", { label: "X", icon: "close" });
      const sinIcono = mount("ofiuco-button", { label: "X" });

      expect(iconOf(conIcono).getAttribute("name")).to.equal("close");
      expect(iconOf(conIcono).hidden).to.equal(false);
      expect(iconOf(sinIcono).hidden).to.equal(true);
    });

    it("en modo icon-only oculta el texto y expone aria-label y title", () => {
      const el = mount("ofiuco-button", {
        label: "Cerrar",
        icon: "close",
        "icon-only": "",
      });

      expect(text(el).hidden).to.equal(true);
      expect(inner(el).getAttribute("aria-label")).to.equal("Cerrar");
      expect(inner(el).title).to.equal("Cerrar");
    });

    it("con texto visible no duplica aria-label ni title", () => {
      const el = mount("ofiuco-button", { label: "Aceptar" });

      expect(inner(el).hasAttribute("aria-label")).to.equal(false);
      expect(inner(el).hasAttribute("title")).to.equal(false);
    });

    it("refleja la variante en data-variant (secondary por defecto)", () => {
      expect(inner(mount("ofiuco-button")).dataset.variant).to.equal(
        "secondary",
      );
      expect(
        inner(mount("ofiuco-button", { variant: "primary" })).dataset.variant,
      ).to.equal("primary");
    });

    it("se actualiza al cambiar atributos", () => {
      const el = mount("ofiuco-button", { label: "A" });

      el.setAttribute("label", "B");
      el.setAttribute("variant", "danger");

      expect(text(el).textContent).to.equal("B");
      expect(inner(el).dataset.variant).to.equal("danger");
    });

    it("emite el evento genérico con el value en detail", () => {
      const spy = listen(BUTTON_CLICK);
      const el = mount("ofiuco-button", { label: "A", value: "abc" });

      inner(el).click();

      expect(spy.calledOnce).to.equal(true);
      expect(spy.firstCall.args[0].detail).to.deep.equal({ value: "abc" });
    });

    it("el evento atraviesa el shadow DOM (composed)", () => {
      let ruta = [];
      const capturar = (evento) => {
        ruta = evento.composedPath(); // solo es válido mientras el evento se despacha
      };
      document.addEventListener(BUTTON_CLICK, capturar);
      const el = mount("ofiuco-button", { label: "A" });

      inner(el).click();
      document.removeEventListener(BUTTON_CLICK, capturar);

      expect(ruta).to.include(el);
    });

    it("deshabilitado: el botón interno se deshabilita y no emite", () => {
      const spy = listen(BUTTON_CLICK);
      const el = mount("ofiuco-button", { label: "A", disabled: "" });

      inner(el).click();

      expect(inner(el).disabled).to.equal(true);
      expect(spy.called).to.equal(false);
    });

    it("la propiedad disabled se sincroniza con el atributo y el botón", () => {
      const el = mount("ofiuco-button", { label: "A" });

      el.disabled = true;
      expect(el.hasAttribute("disabled")).to.equal(true);
      expect(inner(el).disabled).to.equal(true);

      el.disabled = false;
      expect(inner(el).disabled).to.equal(false);
    });
  });

  describe("subclases de HU4", () => {
    [
      ["ofiuco-save-button", "Guardar cambios", ConsultaEventos.GUARDAR, false],
      [
        "ofiuco-next-button",
        "Guardar y avanzar",
        ConsultaEventos.PASO_SIGUIENTE,
        false,
      ],
      [
        "ofiuco-previous-button",
        "Anterior",
        ConsultaEventos.PASO_ANTERIOR,
        false,
      ],
      [
        "ofiuco-return-button",
        "Regresar al dashboard",
        ConsultaEventos.REGRESAR,
        true,
      ],
      [
        "ofiuco-end-button",
        "Finalizar consulta",
        ConsultaEventos.FINALIZAR,
        false,
      ],
      [
        "ofiuco-remove-exam-button",
        "Quitar examen",
        ConsultaEventos.QUITAR_EXAMEN,
        true,
      ],
    ].forEach(([tag, label, evento, soloIcono]) => {
      describe(tag, () => {
        it(`usa "${label}" como etiqueta por defecto`, () => {
          const el = mount(tag);

          expect(el.label).to.equal(label);
          expect(el.iconOnly).to.equal(soloIcono);
          if (soloIcono) {
            expect(inner(el).getAttribute("aria-label")).to.equal(label);
          }
        });

        it(`emite ${evento} y no el evento genérico`, () => {
          const propio = listen(evento);
          const generico = listen(BUTTON_CLICK);
          const el = mount(tag);

          inner(el).click();

          expect(propio.calledOnce).to.equal(true);
          expect(generico.called).to.equal(false);
        });

        it("permite sobrescribir la etiqueta con el atributo label", () => {
          const el = mount(tag, { label: "Otra" });

          expect(el.label).to.equal("Otra");
        });
      });
    });

    it("RemoveExamButton envía el id del examen en detail.value", () => {
      const spy = listen(ConsultaEventos.QUITAR_EXAMEN);
      const el = mount("ofiuco-remove-exam-button", { value: "ppe-1" });

      inner(el).click();

      expect(spy.firstCall.args[0].detail.value).to.equal("ppe-1");
    });

    it("NextButton y PreviousButton llevan ícono; Save y End no", () => {
      expect(mount("ofiuco-next-button").icon).to.equal("next");
      expect(mount("ofiuco-previous-button").icon).to.equal("prev");
      expect(mount("ofiuco-save-button").icon).to.equal(null);
      expect(mount("ofiuco-end-button").icon).to.equal(null);
    });
  });
});
