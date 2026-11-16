import * as chai from "../../lib/chai/index.js";
import "../../../../src/js/boundary/components/layout/ofiuco-confirm-dialog.js";
import { mount, unmountAll } from "../../../helpers.js";

describe("<ofiuco-confirm-dialog>", () => {
  afterEach(unmountAll);

  const dialogo = (el) => el.shadowRoot.querySelector("dialog");
  const accion = (el, nombre) =>
    el.shadowRoot
      .querySelector(`[data-accion="${nombre}"]`)
      .shadowRoot.querySelector("button");

  it("permanece cerrado hasta que se pregunta", () => {
    expect(dialogo(mount("ofiuco-confirm-dialog")).open).to.equal(false);
  });

  it("preguntar abre el diálogo modal", () => {
    const el = mount("ofiuco-confirm-dialog");

    el.preguntar();

    expect(dialogo(el).open).to.equal(true);
  });

  it("resuelve true al aceptar y cierra", async () => {
    const el = mount("ofiuco-confirm-dialog");
    const respuesta = el.preguntar();

    accion(el, "aceptar").click();

    expect(await respuesta).to.equal(true);
    expect(dialogo(el).open).to.equal(false);
  });

  it("resuelve false al cancelar", async () => {
    const el = mount("ofiuco-confirm-dialog");
    const respuesta = el.preguntar();

    accion(el, "cancelar").click();

    expect(await respuesta).to.equal(false);
  });

  it("resuelve false cuando el navegador cierra el diálogo (Esc)", async () => {
    const el = mount("ofiuco-confirm-dialog");
    const respuesta = el.preguntar();

    dialogo(el).close();

    expect(await respuesta).to.equal(false);
  });

  it("resuelve false al hacer clic en el backdrop", async () => {
    const el = mount("ofiuco-confirm-dialog");
    const respuesta = el.preguntar();

    dialogo(el).dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(await respuesta).to.equal(false);
  });

  it("un clic dentro del contenido no lo cierra", () => {
    const el = mount("ofiuco-confirm-dialog");
    el.preguntar();

    el.shadowRoot.querySelector(".dialogo__contenido").click();

    expect(dialogo(el).open).to.equal(true);
  });

  it("lista los avisos como texto plano", () => {
    const el = mount("ofiuco-confirm-dialog");

    el.preguntar({ avisos: ["Se perderán resultados.", "<b>otro</b>"] });

    const items = el.shadowRoot.querySelectorAll(".dialogo__avisos li");
    expect(items).to.have.length(2);
    expect(items[1].textContent).to.equal("<b>otro</b>");
    expect(el.shadowRoot.querySelector(".dialogo__avisos b")).to.equal(null);
  });

  it("oculta la lista cuando no hay avisos", () => {
    const el = mount("ofiuco-confirm-dialog");

    el.preguntar({ avisos: [] });

    expect(el.shadowRoot.querySelector(".dialogo__avisos").hidden).to.equal(
      true,
    );
  });

  it("aplica título, pregunta y etiquetas personalizadas", () => {
    const el = mount("ofiuco-confirm-dialog");

    el.preguntar({
      titulo: "Finalizar",
      pregunta: "¿Cerrar la consulta?",
      aceptar: "Sí, finalizar",
      cancelar: "Volver",
    });

    expect(
      el.shadowRoot.querySelector(".dialogo__titulo").textContent,
    ).to.equal("Finalizar");
    expect(
      el.shadowRoot.querySelector(".dialogo__pregunta").textContent,
    ).to.equal("¿Cerrar la consulta?");
    expect(accion(el, "aceptar").textContent).to.contain("Sí, finalizar");
    expect(accion(el, "cancelar").textContent).to.contain("Volver");
  });

  it("usa valores por defecto sin opciones", () => {
    const el = mount("ofiuco-confirm-dialog");

    el.preguntar();

    expect(
      el.shadowRoot.querySelector(".dialogo__pregunta").textContent,
    ).to.equal("¿Desea continuar?");
  });

  it("una nueva pregunta resuelve false la pendiente y queda abierta", async () => {
    const el = mount("ofiuco-confirm-dialog");
    const primera = el.preguntar({ titulo: "Uno" });

    const segunda = el.preguntar({ titulo: "Dos" });

    expect(await primera).to.equal(false);
    expect(dialogo(el).open).to.equal(true);
    accion(el, "aceptar").click();
    expect(await segunda).to.equal(true);
  });

  it("al desconectarse resuelve false la pregunta pendiente", async () => {
    const el = mount("ofiuco-confirm-dialog");
    const respuesta = el.preguntar();

    el.remove();

    expect(await respuesta).to.equal(false);
  });
});
