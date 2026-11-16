import * as chai from "../../lib/chai/index.js";
import "../../../../src/js/boundary/components/utils/ofiuco-toast.js";
import { BUTTON_CLICK } from "../../../../src/js/boundary/components/functional/ofiuco-button.js";
import { mount, unmountAll } from "../../../helpers.js";

describe("<ofiuco-toast>", () => {
  let reloj;
  const iniciarReloj = () => {
    reloj = sinon.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  };

  afterEach(() => {
    unmountAll();
    reloj?.restore();
    reloj = undefined;
  });

  const toasts = (el) => [...el.shadowRoot.querySelectorAll(".toast")];

  it("no muestra nada al inicio", () => {
    expect(toasts(mount("ofiuco-toast"))).to.have.length(0);
  });

  it("muestra el mensaje y devuelve un id", () => {
    const el = mount("ofiuco-toast");

    const id = el.mostrar({ mensaje: "Hola" });

    expect(id).to.be.a("number");
    expect(toasts(el)).to.have.length(1);
    expect(toasts(el)[0].querySelector(".toast__mensaje").textContent).to.equal(
      "Hola",
    );
  });

  it("inserta el mensaje como texto, nunca como HTML", () => {
    const el = mount("ofiuco-toast");

    el.mostrar({ mensaje: "<img src=x onerror=alert(1)>" });

    expect(el.shadowRoot.querySelector(".toast img")).to.equal(null);
    expect(toasts(el)[0].textContent).to.contain("<img");
  });

  it("los errores usan role=alert; el resto role=status", () => {
    const el = mount("ofiuco-toast");

    el.mostrar({ tipo: "error", mensaje: "e" });
    el.mostrar({ tipo: "exito", mensaje: "x" });
    el.mostrar({ mensaje: "i" });

    expect(toasts(el).map((t) => t.getAttribute("role"))).to.deep.equal([
      "alert",
      "status",
      "status",
    ]);
  });

  it("aplica la clase del tipo y usa info ante un tipo desconocido", () => {
    const el = mount("ofiuco-toast");

    el.mostrar({ tipo: "exito", mensaje: "a" });
    el.mostrar({ tipo: "raro", mensaje: "b" });

    expect(toasts(el)[0].classList.contains("toast--exito")).to.equal(true);
    expect(toasts(el)[1].classList.contains("toast--info")).to.equal(true);
  });

  it("los avisos se cierran solos a los 5 segundos", () => {
    iniciarReloj();
    const el = mount("ofiuco-toast");
    el.mostrar({ tipo: "exito", mensaje: "ok" });

    reloj.tick(4999);
    expect(toasts(el)).to.have.length(1);

    reloj.tick(1);
    expect(toasts(el)).to.have.length(0);
  });

  it("respeta una duración personalizada", () => {
    iniciarReloj();
    const el = mount("ofiuco-toast");
    el.mostrar({ mensaje: "ok", duracion: 1000 });

    reloj.tick(1000);

    expect(toasts(el)).to.have.length(0);
  });

  it("los errores no se cierran solos", () => {
    iniciarReloj();
    const el = mount("ofiuco-toast");
    el.mostrar({ tipo: "error", mensaje: "falló" });

    reloj.tick(60_000);

    expect(toasts(el)).to.have.length(1);
  });

  it("duracion 0 hace permanente cualquier tipo", () => {
    iniciarReloj();
    const el = mount("ofiuco-toast");
    el.mostrar({ tipo: "exito", mensaje: "ok", duracion: 0 });

    reloj.tick(60_000);

    expect(toasts(el)).to.have.length(1);
  });

  it("el botón de cerrar elimina esa notificación", () => {
    const el = mount("ofiuco-toast");
    el.mostrar({ mensaje: "uno" });
    el.mostrar({ mensaje: "dos" });

    toasts(el)[0]
      .querySelector("ofiuco-button")
      .shadowRoot.querySelector("button")
      .click();

    expect(toasts(el)).to.have.length(1);
    expect(toasts(el)[0].textContent).to.contain("dos");
  });

  it("el botón de cerrar es accesible y no filtra su evento", () => {
    const spy = sinon.spy();
    document.addEventListener(BUTTON_CLICK, spy);
    const el = mount("ofiuco-toast");
    el.mostrar({ mensaje: "uno" });
    const boton = toasts(el)[0].querySelector("ofiuco-button");

    boton.shadowRoot.querySelector("button").click();
    document.removeEventListener(BUTTON_CLICK, spy);

    expect(
      boton.shadowRoot.querySelector("button").getAttribute("aria-label"),
    ).to.equal("Cerrar notificación");
    expect(spy.called).to.equal(false);
  });

  it("cerrar(id) elimina una notificación y cerrar de un id inexistente no falla", () => {
    const el = mount("ofiuco-toast");
    const id = el.mostrar({ mensaje: "uno" });

    el.cerrar(id);
    expect(toasts(el)).to.have.length(0);
    expect(() => el.cerrar(999)).to.not.throw();
  });

  it("cerrar una notificación cancela su temporizador", () => {
    iniciarReloj();
    const el = mount("ofiuco-toast");
    const id = el.mostrar({ mensaje: "uno" });
    expect(reloj.countTimers()).to.be.greaterThan(0);

    el.cerrar(id);

    const pendientesToast = reloj.countTimers();
    reloj.tick(10_000);
    expect(pendientesToast).to.be.lessThan(2);
    expect(toasts(el)).to.have.length(0);
  });

  it("limpiar cierra todas", () => {
    const el = mount("ofiuco-toast");
    el.mostrar({ mensaje: "a" });
    el.mostrar({ tipo: "error", mensaje: "b" });

    el.limpiar();

    expect(toasts(el)).to.have.length(0);
  });

  it("muestra como máximo 4 y descarta las más viejas", () => {
    const el = mount("ofiuco-toast");

    for (let i = 1; i <= 6; i += 1) el.mostrar({ mensaje: `m${i}` });

    const mensajes = toasts(el).map(
      (t) => t.querySelector(".toast__mensaje").textContent,
    );
    expect(mensajes).to.deep.equal(["m3", "m4", "m5", "m6"]);
  });

  it("al desconectarse limpia notificaciones y temporizadores", () => {
    iniciarReloj();
    const el = mount("ofiuco-toast");
    el.mostrar({ mensaje: "a", duracion: 1000 });
    const temporizadoresAntes = reloj.countTimers();

    el.remove();

    expect(reloj.countTimers()).to.be.lessThan(temporizadoresAntes);
    expect(toasts(el)).to.have.length(0);
  });
});
