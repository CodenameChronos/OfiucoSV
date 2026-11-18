/**
 * @fileoverview Web Component `<ofiuco-footer>`: pie de página común de la SPA.
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

/**
 * Componente web `<ofiuco-footer [institucion] [version] [anio]>`.
 *
 * Renderiza el pie de página institucional con la marca `"OfiucoSV"`, espacios de
 * proyección mediante `<slot name="descripcion">` y `<slot name="enlaces">`, y la
 * línea legal dinámica con año de copyright, institución y versión opcional.
 *
 * @extends BaseComponent
 */
export class OfiucoFooter extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/footer.css",
      import.meta.url,
    ).href,
  ];

  /**
   * Lista de atributos HTML observados para actualizar la línea legal reactivamente.
   * @type {string[]}
   */
  static observedAttributes = ["institucion", "version", "anio"];

  #copyright;
  #version;

  /**
   * Construye la estructura DOM del pie de página dentro del Shadow DOM (`<footer>`,
   * sección de marca con `<slot name="descripcion">`, `<nav>` con `<slot name="enlaces">`
   * y línea legal) y aplica los valores iniciales de los atributos.
   */
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
        h(
          "p",
          { class: "legal" },
          this.#copyright,
          this.#version,
          "Todos los derechos reservados",
        ),
      ),
    );

    this.#actualizar();
  }


  // Los atributos pueden llegar antes de render(): se aplican al terminar de
  // renderizar, y a partir de ahí en cada cambio.
  attributeChangedCallback() {
    if (this.rendered) this.#actualizar();
  }

  /**
   * Sincroniza el texto de `#copyright` (combinando `anio` e `institucion`) y la
   * visibilidad y contenido de `#version` en función de los atributos HTML actuales.
   */
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