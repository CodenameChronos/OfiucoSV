import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";
import "../utils/ofiuco-icon.js";

const stylesUrl = new URL(
  "../../../../resources/styles/components/button.css",
  import.meta.url,
).href;

/** Evento que emite el botón genérico cuando una subclase no define el suyo. */
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
 */
export class OfiucoButton extends BaseComponent {
  static styleUrls = [stylesUrl];

  static observedAttributes = [
    "label",
    "icon",
    "variant",
    "icon-only",
    "disabled",
    "value",
  ];

  /** Valores por defecto que las subclases sobrescriben. */
  static defaultLabel = "";
  static defaultIcon = null;
  static defaultVariant = "secondary";
  static defaultIconOnly = false;
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

  /** Lleva el foco al botón interno (gestión de foco desde la página). */
  focus(opciones) {
    this.#button?.focus(opciones);
  }

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

  attributeChangedCallback() {
    if (this.rendered) this.#sincronizar();
  }

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
