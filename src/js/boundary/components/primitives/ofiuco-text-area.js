import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

export class OfiucoTextArea extends BaseComponent {
  static observedAttributes = [
    "label",
    "value",
    "placeholder",
    "rows",
    "maxlength",
    "required",
    "disabled",
    "readonly",
  ];

  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/text_area.css",
      import.meta.url,
    ).href,
  ];

  #label;
  #control;
  #hint;

  get value() {
    return this.#control?.value ?? this.getAttribute("value") ?? "";
  }

  set value(value) {
    const text = String(value ?? "");

    if (this.#control) {
      this.#control.value = text;
      this.#updateCounter();
    } else {
      this.setAttribute("value", text);
    }
  }

  get rows() {
    if (this.#control) {
      return this.#control.rows;
    }

    const value = Number(this.getAttribute("rows"));

    return Number.isInteger(value) && value > 0 ? value : 4;
  }

  set rows(value) {
    const number = Number(value);

    this.setAttribute(
      "rows",
      String(Number.isInteger(number) && number > 0 ? number : 4),
    );
  }

  get maxLength() {
    if (!this.#control) {
      const value = this.getAttribute("maxlength");
      return value === null ? -1 : Number(value);
    }

    return this.#control.maxLength;
  }

  set maxLength(value) {
    const number = Number(value);

    if (value == null || value === "") {
      this.removeAttribute("maxlength");
    } else if (Number.isInteger(number) && number >= 0) {
      this.setAttribute("maxlength", String(number));
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

  get readOnly() {
    return this.hasAttribute("readonly");
  }

  set readOnly(value) {
    this.toggleAttribute("readonly", Boolean(value));
  }

  render() {
    const id = `ofiuco-textarea-${
      globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
    }`;

    this.#label = h(
      "label",
      { for: id, class: "label" },
      this.getAttribute("label") || "Descripción",
    );

    this.#control = h("textarea", {
      id,
      rows: this.rows,
      placeholder: this.getAttribute("placeholder") || "",
      maxlength: this.getAttribute("maxlength"),
      required: this.required,
      disabled: this.disabled,
      readonly: this.readOnly,
    });

    this.#control.value = this.getAttribute("value") || "";

    const hintId = `${id}-counter`;

    this.#hint = h("small", {
      id: hintId,
      class: "counter",
      "aria-live": "polite",
    });

    this.#control.setAttribute("aria-describedby", hintId);

    this.#control.addEventListener("input", () => {
      this.#updateCounter();

      this.dispatchEvent(
        new CustomEvent("value-changed", {
          bubbles: true,
          composed: true,
          detail: { value: this.value },
        }),
      );
    });

    this.#control.addEventListener("change", () => {
      this.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          composed: true,
          detail: { value: this.value },
        }),
      );
    });

    this.shadowRoot.append(
      h("div", { class: "field" }, this.#label, this.#control, this.#hint),
    );

    this.#updateCounter();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.rendered || oldValue === newValue) return;

    if (name === "label") {
      this.#label.textContent = newValue || "Descripción";
    } else if (name === "value") {
      this.#control.value = newValue || "";
      this.#updateCounter();
    } else if (name === "placeholder") {
      this.#control.placeholder = newValue || "";
    } else if (name === "rows") {
      const number = Number(newValue);
      this.#control.rows = Number.isInteger(number) && number > 0 ? number : 4;
    } else if (name === "maxlength") {
      if (newValue === null) {
        this.#control.removeAttribute("maxlength");
      } else {
        const number = Number(newValue);

        if (Number.isInteger(number) && number >= 0) {
          this.#control.maxLength = number;
        }
      }

      this.#updateCounter();
    } else if (
      name === "disabled" ||
      name === "required" ||
      name === "readonly"
    ) {
      this.#control.toggleAttribute(name, this.hasAttribute(name));
    }
  }

  #updateCounter() {
    if (!this.#control || !this.#hint) return;

    const max = this.#control.maxLength;

    this.#hint.textContent = max >= 0 ? `${this.value.length} / ${max}` : "";

    this.#hint.hidden = max < 0;
  }
}

defineOnce("ofiuco-text-area", OfiucoTextArea);

export default OfiucoTextArea;
