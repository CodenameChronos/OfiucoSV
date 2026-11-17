/**
 * @fileoverview Web Component `<ofiuco-avatar>` que renderiza un avatar genérico
 * accesible (`role="img"`) con la silueta de usuario (`<ofiuco-icon name="user">`)
 * y etiqueta descriptiva configurable mediante el atributo `label`.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import "./ofiuco-icon.js";

/** @type {string} URL resuelta de la hoja de estilos asociada al componente avatar. */
const stylesUrl = new URL(
  "../../../../resources/styles/components/avatar.css",
  import.meta.url,
).href;

/**
 * Componente web `<ofiuco-avatar [label="Sin fotografía"]>`.
 *
 * Foto genérica (silueta) igual para todos los pacientes. Es una imagen con
 * texto alternativo (`label`); el tamaño se ajusta con `--avatar-size`.
 *
 * Atributos observados:
 * - `label`: Texto alternativo asignado a `aria-label` (por defecto `"Sin fotografía"`).
 *
 * @extends BaseComponent
 */
export class OfiucoAvatar extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [stylesUrl];

  /**
   * Lista de atributos HTML observados para actualizar la descripción accesible.
   * @type {string[]}
   */
  static observedAttributes = ["label"];

  #contenedor;

  /**
   * Construye la estructura DOM del avatar dentro del Shadow DOM
   * (`<div class="avatar" role="img">` con `<ofiuco-icon name="user">`) y
   * sincroniza el atributo accesible inicial.
   */
  render() {
    this.#contenedor = h(
      "div",
      { class: "avatar", role: "img" },
      h("ofiuco-icon", { name: "user" }),
    );
    this.shadowRoot.append(this.#contenedor);
    this.#sincronizar();
  }

  /**
   * Callback nativo de Custom Elements ejecutado cuando cambia el atributo `label`.
   * Actualiza el `aria-label` si el componente ya se encuentra renderizado.
   */
  attributeChangedCallback() {
    if (this.rendered) this.#sincronizar();
  }

  /**
   * Sincroniza el atributo `aria-label` de `#contenedor` con el valor de `label`
   * o `"Sin fotografía"` si el atributo no está definido o está vacío.
   */
  #sincronizar() {
    this.#contenedor.setAttribute(
      "aria-label",
      this.getAttribute("label") || "Sin fotografía",
    );
  }
}

defineOnce("ofiuco-avatar", OfiucoAvatar);
export default OfiucoAvatar;