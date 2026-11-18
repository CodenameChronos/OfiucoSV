/**
 * @fileoverview Web Component `<ofiuco-auto-complete>` que implementa un campo de
 * entrada con autocompletado accesible (`role="combobox"` y `role="listbox"`).
 * Filtra opciones en memoria a partir de un umbral mínimo de caracteres (`min-chars`),
 * limita la cantidad de sugerencias visibles (`max-results`), soporta navegación por
 * teclado (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`) y emite eventos personalizados
 * al modificar el texto (`value-changed`) o elegir una opción (`option-selected`).
 */

import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

/**
 * Componente web `<ofiuco-auto-complete [label] [placeholder] [value] [disabled] [required] [min-chars] [max-results]>`.
 *
 * Control de entrada de texto con lista desplegable de sugerencias filtradas.
 * Normaliza automáticamente arreglos de cadenas, números u objetos de dominio
 * (`id`, `idTipoDocumento`, `idClinica`, `idRol`, `idPersona`, `nombre`, `descripcion`, etc.).
 *
 * Eventos emitidos (`bubbles: true`, `composed: true`):
 * - `value-changed`: Cuando el usuario escribe en el campo (`detail: { value }`).
 * - `option-selected`: Cuando el usuario selecciona una sugerencia (`detail: { value, label, option }`).
 *
 * @extends BaseComponent
 * @fires CustomEvent#value-changed
 * @fires CustomEvent#option-selected
 */
export class OfiucoAutoComplete extends BaseComponent {
  /**
   * Lista de atributos HTML observados para sincronizar el estado y presentación del control.
   * @type {string[]}
   */
  static observedAttributes = [
    "label",
    "placeholder",
    "value",
    "disabled",
    "required",
    "min-chars",
    "max-results",
  ];

  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/auto_complete.css",
      import.meta.url,
    ).href,
  ];

  #label;
  #input;
  #list;
  #options = [];
  #visible = [];
  #active = -1;
  #selected = null;

  get value() {
    return (
      this.#selected?.value ??
      this.#input?.value ??
      this.getAttribute("value") ??
      ""
    );
  }

  set value(value) {
    const text = String(value ?? "");

    if (this.#input) {
      this.#input.value = text;
      this.#selected = null;
      this.#active = -1;
      this.#close();
    } else {
      this.setAttribute("value", text);
    }
  }

  get options() {
    return [...this.#options];
  }

  set options(items) {
    this.#options = Array.isArray(items) ? items : [];
    // Solo repintar si el usuario está interactuando con el campo.
    if (this.shadowRoot?.activeElement === this.#input) {
      this.#paintOptions(this.#input?.value || "");
    }
  }

  get selectedOption() {
    return this.#selected;
  }

  get disabled() {
    return this.hasAttribute("disabled");
  }

  set disabled(value) {
    this.toggleAttribute("disabled", Boolean(value));
  }

  get minChars() {
    const value = this.getAttribute("min-chars");

    if (value === null) return 3;

    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : 3;
  }

  get maxResults() {
    const value = Number(this.getAttribute("max-results"));

    return Number.isInteger(value) && value > 0 ? value : 10;
  }

  /**
   * Construye la estructura DOM del campo dentro del Shadow DOM (`<label>`, `<input role="combobox">`
   * y `<ul role="listbox">`) y registra los manejadores de eventos (`input`, `focus`, `keydown`, `blur`).
   */
  render() {
    const id = `ofiuco-ac-${
      globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
    }`;

    this.#label = h(
      "label",
      { for: id, class: "label" },
      this.getAttribute("label") || "Buscar",
    );

    this.#input = h("input", {
      id,
      type: "text",
      role: "combobox",
      "aria-autocomplete": "list",
      "aria-expanded": "false",
      "aria-controls": `${id}-list`,
      placeholder: this.getAttribute("placeholder") || "",
      autocomplete: "off",
      disabled: this.disabled,
      required: this.hasAttribute("required"),
    });

    this.#list = h("ul", {
      id: `${id}-list`,
      class: "options",
      role: "listbox",
      hidden: true,
    });

    this.#input.value = this.getAttribute("value") || "";

    this.#input.addEventListener("input", () => {
      this.#selected = null;
      this.#active = -1;

      this.dispatchEvent(
        new CustomEvent("value-changed", {
          bubbles: true,
          composed: true,
          detail: { value: this.#input.value },
        }),
      );

      this.#paintOptions(this.#input.value);
    });

    this.#input.addEventListener("focus", () => {
      this.#paintOptions(this.#input.value);
    });

    this.#input.addEventListener("keydown", (event) => {
      this.#onKeyDown(event);
    });

    this.#input.addEventListener("blur", () => {
      setTimeout(() => this.#close(), 120);
    });

    this.shadowRoot.append(
      h("div", { class: "field" }, this.#label, this.#input, this.#list),
    );
  }

  /**
   * Callback nativo de Custom Elements ejecutado cuando cambia alguno de los atributos observados.
   * Sincroniza etiquetas, marcadores de posición, valores, estados booleanos o vuelve a filtrar opciones.
   *
   * @param {string} name - Nombre del atributo modificado.
   * @param {string|null} oldValue - Valor anterior del atributo.
   * @param {string|null} newValue - Nuevo valor del atributo.
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.rendered || oldValue === newValue) return;

    if (name === "label") {
      this.#label.textContent = newValue || "Buscar";
    } else if (name === "placeholder") {
      this.#input.placeholder = newValue || "";
    } else if (name === "value") {
      this.#input.value = newValue || "";
      this.#selected = null;
      this.#close();
    } else if (name === "disabled" || name === "required") {
      this.#input.toggleAttribute(name, this.hasAttribute(name));

      if (name === "disabled" && this.disabled) {
        this.#close();
      }
    } else if (name === "min-chars" || name === "max-results") {
      this.#paintOptions(this.#input.value);
    }
  }

  /**
   * Normaliza un elemento heterogéneo de `#options` (primitivo u objeto de dominio)
   * a una estructura estándar `{ value, label, source }`.
   *
   * @param {*} item - Elemento original del arreglo de opciones.
   * @returns {{ value: string, label: string, source: * }} Opción normalizada.
   */
  #normalise(item) {
    if (typeof item === "string" || typeof item === "number") {
      return {
        value: String(item),
        label: String(item),
        source: item,
      };
    }

    const value =
      item?.value ??
      item?.id ??
      item?.idTipoDocumento ??
      item?.idClinica ??
      item?.idRol ??
      item?.idPersona ??
      "";

    const label =
      item?.label ?? item?.nombre ?? item?.descripcion ?? item?.value ?? "";

    return {
      value: String(value),
      label: String(label),
      source: item,
    };
  }

  /**
   * Filtra `#options` según el texto ingresado (`query`), renderiza los elementos
   * `<li role="option">` correspondientes en `#list` hasta `maxResults` y actualiza
   * los atributos ARIA de expansión del `combobox`.
   *
   * @param {string} query - Texto actual ingresado en el campo de búsqueda.
   */
  #paintOptions(query) {
    if (!this.#list || !this.#input) return;

    const text = query.trim();

    if (text.length < this.minChars || this.disabled) {
      this.#visible = [];
      this.#active = -1;
      this.#list.replaceChildren();
      this.#list.hidden = true;
      this.#input.setAttribute("aria-expanded", "false");
      this.#input.removeAttribute("aria-activedescendant");
      return;
    }

    const normalizedQuery = text.toLocaleLowerCase();

    this.#visible = this.#options
      .map((item) => this.#normalise(item))
      .filter((item) =>
        item.label.toLocaleLowerCase().includes(normalizedQuery),
      )
      .slice(0, this.maxResults);

    this.#active = -1;

    this.#list.replaceChildren(
      ...this.#visible.map((item, index) => {
        const optionId = `${this.#list.id}-option-${index}`;

        const li = h(
          "li",
          {
            id: optionId,
            role: "option",
            "aria-selected": "false",
          },
          h(
            "button",
            {
              type: "button",
              tabindex: "-1",
            },
            item.label,
          ),
        );

        const button = li.querySelector("button");

        button.addEventListener("mousedown", (event) => {
          event.preventDefault();
        });

        button.addEventListener("click", () => {
          this.#select(item);
        });

        return li;
      }),
    );

    this.#list.hidden = this.#visible.length === 0;

    this.#input.setAttribute("aria-expanded", String(!this.#list.hidden));
  }

  /**
   * Confirma la selección de una opción, actualiza el valor del input con su etiqueta,
   * cierra la lista desplegable y despacha el evento `option-selected`.
   *
   * @param {{ value: string, label: string, source: * }} item - Opción normalizada elegida.
   */
  #select(item) {
    this.#selected = {
      value: item.value,
      label: item.label,
      option: item.source,
    };

    this.#input.value = item.label;
    this.#close();

    this.dispatchEvent(
      new CustomEvent("option-selected", {
        bubbles: true,
        composed: true,
        detail: this.#selected,
      }),
    );
  }

  /**
   * Oculta la lista desplegable de sugerencias y restablece `aria-expanded` y
   * `aria-activedescendant` en el campo de entrada.
   */
  #close() {
    if (!this.#list) return;

    this.#list.hidden = true;
    this.#input.setAttribute("aria-expanded", "false");
    this.#input.removeAttribute("aria-activedescendant");
  }

  /**
   * Gestiona la navegación y selección por teclado dentro del campo:
   * - `Escape`: Cierra la lista desplegable.
   * - `ArrowDown` / `ArrowUp`: Desplaza el índice activo `#active` y actualiza `aria-selected` y `aria-activedescendant`.
   * - `Enter`: Selecciona la opción actualmente resaltada si existe.
   *
   * @param {KeyboardEvent} event - Evento de teclado capturado en `#input`.
   */
  #onKeyDown(event) {
    if (event.key === "Escape") {
      this.#close();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (this.#visible.length === 0) return;

      event.preventDefault();

      const direction = event.key === "ArrowDown" ? 1 : -1;

      this.#active = Math.max(
        0,
        Math.min(this.#visible.length - 1, this.#active + direction),
      );

      [...this.#list.children].forEach((li, index) => {
        const active = index === this.#active;

        li.classList.toggle("active", active);
        li.setAttribute("aria-selected", String(active));
      });

      const activeOption = this.#list.children[this.#active];

      this.#input.setAttribute("aria-activedescendant", activeOption.id);
    } else if (event.key === "Enter" && this.#visible[this.#active]) {
      event.preventDefault();
      this.#select(this.#visible[this.#active]);
    }
  }
}

defineOnce("ofiuco-auto-complete", OfiucoAutoComplete);

export default OfiucoAutoComplete;
