/**
 * @file <ofiuco-footer>: pie de página común de la SPA.
 *
 * Uso:
 *   <ofiuco-footer institucion="Universidad de El Salvador" version="1.0.0">
 *     <span slot="descripcion">Sistema de información de salud.</span>
 *     <a slot="enlaces" href="/ayuda">Ayuda</a>
 *     <a slot="enlaces" href="/privacidad">Privacidad</a>
 *   </ofiuco-footer>
 *
 * Los enlaces y la descripción se proyectan con slots (light DOM) en lugar de
 * generarse dentro del shadow root. Así el router de la SPA, que normalmente
 * intercepta los clics de los <a> a nivel de documento, sigue funcionando sin
 * cambios, y cada página puede decidir qué enlaces muestra.
 *
 * Atributos (todos opcionales):
 *   institucion  texto junto al año en la línea legal.
 *   version      versión de la aplicación; si falta, no se muestra.
 *   anio         año del copyright; por defecto, el año actual.
 */
import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

export class OfiucoFooter extends BaseComponent {
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/footer.css",
      import.meta.url,
    ).href,
  ];

  static observedAttributes = ["institucion", "version", "anio"];

  #copyright;
  #version;

  render() {
    this.#copyright = h("span", { class: "copyright" });
    this.#version = h("span", { class: "version" });

    this.shadowRoot.append(
      h(
        "footer",
        { part: "footer" },
        h(
          "div",
          { class: "marca" },
          h("strong", { class: "nombre" }, "OfiucoSV"),
          h("p", { class: "descripcion" }, h("slot", { name: "descripcion" })),
        ),
        h(
          "nav",
          { class: "enlaces", "aria-label": "Enlaces del pie de página" },
          h("slot", { name: "enlaces" }),
        ),
        h("p", { class: "legal" }, this.#copyright, this.#version),
      ),
    );

    this.#actualizar();
  }

  // Los atributos pueden llegar antes de render(): se aplican al terminar de
  // renderizar, y a partir de ahí en cada cambio.
  attributeChangedCallback() {
    if (this.rendered) this.#actualizar();
  }

  #actualizar() {
    const anio = this.getAttribute("anio") || new Date().getFullYear();
    const institucion = this.getAttribute("institucion");
    this.#copyright.textContent = institucion
      ? `© ${anio} ${institucion}`
      : `© ${anio}`;

    const version = this.getAttribute("version");
    this.#version.textContent = version ? `Versión ${version}` : "";
    this.#version.hidden = !version;
  }
}

defineOnce("ofiuco-footer", OfiucoFooter);
