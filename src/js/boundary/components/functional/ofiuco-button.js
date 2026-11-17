/**
 * @fileoverview Web Component base `<ofiuco-button>` para botones reutilizables del sistema.
 * Diseñado para ser utilizado directamente o extendido por botones especializados
 * (ej. `SaveButton`, `NextButton`) que personalizan sus propiedades estáticas por defecto
 * y el nombre del evento emitido al hacer clic.
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import "../utils/ofiuco-icon.js";

/** @type {string} URL resuelta de la hoja de estilos asociada al componente botón. */
const stylesUrl = new URL(
  "../../../../resources/styles/components/button.css",
  import.meta.url,
).href;

/**
 * Nombre del evento personalizado por defecto que emite el botón genérico
 * cuando una subclase no define su propio `eventName`.
 * @type {string}
 */
export const BUTTON_CLICK = "ofiuco:button-click";

/**
 * <ofiuco-button label="Texto" icon="close" variant="primary" icon-only value="id">
 *
 * Botón base. Las subclases (SaveButton, NextButton...) solo sobrescriben los
 * valores por defecto estáticos y el nombre del evento que emiten.
 *
 * Atributos:
 *  - label:     texto visible (o texto accesible si es solo ícono).
 *  - icon:      nombre de un ícono del registro de ofiuco-icon.
 *  - variant:   primary | secondary | danger.
 *  - icon-only: oculta el texto; label pasa a aria-label y title.
 *  - disabled:  deshabilita el botón (no emite eventos).
 *  - value:     se incluye en `detail.value` del evento (p. ej. un id).
 *
 * Al hacer clic emite `eventName` (bubbles + composed) con `detail: { value }`.
 * No ejecuta lógica: quien lo contiene decide qué hacer.
 * @extends BaseComponent
 * @fires CustomEvent#ofiuco:button-click
 */
export class OfiucoButton extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [stylesUrl];

  /**
   * Lista de atributos HTML observados para reactividad automática.
   * @type {string[]}
   */
  static observedAttributes = [
    "label",
    "icon",
    "variant",
    "icon-only",
    "disabled",
    "value",
  ];

  /** @type {string} Etiqueta por defecto cuando no se especifica el atributo `label`. */
  static defaultLabel = "";

  /** @type {string|null} Nombre de ícono por defecto cuando no se especifica `icon`. */
  static defaultIcon = null;

  /** @type {string} Variante visual por defecto (`primary` | `secondary` | `danger`). */
  static defaultVariant = "secondary";

  /** @type {boolean} Indica si por defecto el botón muestra únicamente el ícono. */
  static defaultIconOnly = false;

  /** @type {string} Nombre del evento personalizado que se despacha al hacer clic. */
  static eventName = BUTTON_CLICK;

  #button;
  #iconEl;
  #textEl;

  get label() {
    return this.getAttribute("label") ?? this.constructor.defaultLabel;
  }

  get icon() {
    return this.getAttribute("icon") ?? this.constructor.defaultIcon;
  }

  get variant() {
    return this.getAttribute("variant") ?? this.constructor.defaultVariant;
  }

  get iconOnly() {
    return this.hasAttribute("icon-only") || this.constructor.defaultIconOnly;
  }

  get disabled() {
    return this.hasAttribute("disabled");
  }

  set disabled(value) {
    this.toggleAttribute("disabled", Boolean(value));
  }

  get value() {
    return this.getAttribute("value") ?? "";
  }

  set value(valor) {
    this.setAttribute("value", String(valor ?? ""));
  }

  /**
   * Transfiere el foco al elemento `<button>` interno dentro del Shadow DOM
   * (útil para gestión de accesibilidad y foco desde vistas o formularios padre).
   *
   * @param {FocusOptions} [opciones] - Opciones estándar de `HTMLElement.prototype.focus()`.
   */
  focus(opciones) {
    this.#button?.focus(opciones);
  }

  /**
   * Construye la estructura interna del componente (`<button>`, `<ofiuco-icon>` y `<span>`),
   * enlaza el evento `click` y sincroniza el estado inicial de sus atributos.
   */
  render() {
    this.#iconEl = h("ofiuco-icon");
    this.#textEl = h("span", { class: "button__texto" });
    this.#button = h(
      "button",
      { type: "button", class: "button", part: "button" },
      this.#iconEl,
      this.#textEl,
    );
    this.#button.addEventListener("click", () => this.#emitir());
    this.shadowRoot.append(this.#button);
    this.#sincronizar();
  }

  /**
   * Callback nativo de Custom Elements ejecutado cuando cambia algún atributo observado.
   * Actualiza la vista interna si el componente ya ha sido renderizado.
   */
  attributeChangedCallback() {
    if (this.rendered) this.#sincronizar();
  }

  /**
   * Sincroniza el estado de las propiedades y atributos actuales (`variant`, `disabled`,
   * `icon`, `label`, `iconOnly`) con los elementos internos del Shadow DOM y atributos ARIA.
   */
  #sincronizar() {
    const { label, icon, iconOnly } = this;

    this.#button.dataset.variant = this.variant;
    this.#button.disabled = this.disabled;
    this.#button.classList.toggle("button--solo-icono", iconOnly);

    if (icon) this.#iconEl.setAttribute("name", icon);
    else this.#iconEl.removeAttribute("name");
    this.#iconEl.hidden = !icon;

    this.#textEl.textContent = label;
    this.#textEl.hidden = iconOnly || label === "";

    if (iconOnly) {
      this.#button.setAttribute("aria-label", label);
      this.#button.title = label;
    } else {
      this.#button.removeAttribute("aria-label");
      this.#button.removeAttribute("title");
    }
  }

  /**
   * Despacha el evento personalizado definido en `this.constructor.eventName`
   * atravesando el límite del Shadow DOM (`composed: true`) y burbujeando (`bubbles: true`).
   */
  #emitir() {
    this.dispatchEvent(
      new CustomEvent(this.constructor.eventName, {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

defineOnce("ofiuco-button", OfiucoButton);
export default OfiucoButton;