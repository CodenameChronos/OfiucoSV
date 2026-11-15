
import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

export class OfiucoDatePicker extends BaseComponent {
  static observedAttributes = [
    "label",
    "value",
    "min",
    "max",
    "min-date",
    "max-date",
    "required",
    "disabled"
  ];

  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/date_picker.css",
      import.meta.url
    ).href
  ];

  #label;
  #input;

  get value() {
    return this.#input?.value ??
      this.getAttribute("value") ??
      "";
  }

  set value(value) {
    const date = String(value ?? "");

    if (this.#input) {
      this.#input.value = date;
    } else {
      this.setAttribute("value", date);
    }
  }

  get minDate() {
    return this.#input?.min ??
      this.getAttribute("min-date") ??
      this.getAttribute("min") ??
      "";
  }

  set minDate(value) {
    const date = String(value ?? "");

    if (date) {
      this.setAttribute("min-date", date);
    } else {
      this.removeAttribute("min-date");
    }
  }

  get maxDate() {
    return this.#input?.max ??
      this.getAttribute("max-date") ??
      this.getAttribute("max") ??
      "";
  }

  set maxDate(value) {
    const date = String(value ?? "");

    if (date) {
      this.setAttribute("max-date", date);
    } else {
      this.removeAttribute("max-date");
    }
  }

  get disabled() {
    return this.hasAttribute("disabled");
  }

  set disabled(value) {
    this.toggleAttribute("disabled", Boolean(value));
  }

  get required() {
    return this.hasAttribute("required");
  }

  set required(value) {
    this.toggleAttribute("required", Boolean(value));
  }

  render() {
    const id = `ofiuco-date-${globalThis.crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2)}`;

    this.#label = h(
      "label",
      { for: id, class: "label" },
      this.getAttribute("label") || "Fecha"
    );

    this.#input = h("input", {
      id,
      type: "date",
      min: this.minDate,
      max: this.maxDate,
      required: this.required,
      disabled: this.disabled
    });

    this.#input.value = this.getAttribute("value") || "";

    this.#input.addEventListener("change", () => {
      this.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          composed: true,
          detail: {
            value: this.value
          }
        })
      );
    });

    this.shadowRoot.append(
      h(
        "div",
        { class: "field" },
        this.#label,
        this.#input
      )
    );
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.rendered || oldValue === newValue) return;

    if (name === "label") {
      this.#label.textContent = newValue || "Fecha";
    } else if (name === "value") {
      this.#input.value = newValue || "";
    } else if (name === "min" || name === "min-date") {
      this.#input.min =
        this.getAttribute("min-date") ??
        this.getAttribute("min") ??
        "";
    } else if (name === "max" || name === "max-date") {
      this.#input.max =
        this.getAttribute("max-date") ??
        this.getAttribute("max") ??
        "";
    } else if (name === "required" || name === "disabled") {
      this.#input.toggleAttribute(
        name,
        this.hasAttribute(name)
      );
    }
  }
}

defineOnce("ofiuco-date-picker", OfiucoDatePicker);

export default OfiucoDatePicker;
