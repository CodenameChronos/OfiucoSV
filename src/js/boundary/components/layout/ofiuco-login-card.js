/**
 * @fileoverview Web Component `<ofiuco-login-card>` que implementa la tarjeta
 * interactiva de inicio de sesión por selección en cascada (Clínica -> Rol -> Persona)
 * utilizando componentes `<ofiuco-auto-complete>`. Valida que las tres selecciones
 * estén completas antes de emitir el evento `login-requested`.
 */

import "../primitives/ofiuco-auto-complete.js";
import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

/**
 * Componente web `<ofiuco-login-card>`.
 *
 * Presenta un formulario de acceso con selección dependiente en tres pasos:
 * 1. Clínica (`clinicas`)
 * 2. Rol (`roles`, habilitado tras seleccionar clínica)
 * 3. Persona (`personas`, habilitado tras seleccionar rol)
 *
 * Al enviar el formulario con las tres opciones seleccionadas, despacha el evento
 * personalizado `login-requested` (`bubbles: true`, `composed: true`) con
 * `detail: { clinica, rol, persona }`.
 *
 * @extends BaseComponent
 * @fires CustomEvent#login-requested
 */
export class OfiucoLoginCard extends BaseComponent {
  /**
   * Hojas de estilo cargadas en el Shadow DOM del componente.
   * @type {string[]}
   */
  static styleUrls = [
    new URL(
      "../../../../resources/styles/components/login_card.css",
      import.meta.url,
    ).href,
  ];

  #clinic;
  #role;
  #person;
  #form;
  #feedback;
  #submit;
  #clinicas = [];
  #roles = [];
  #personas = [];
  #selected = {
    clinica: null,
    rol: null,
    persona: null,
  };

  get clinicas() {
    return this.#clinicas;
  }

  set clinicas(value) {
    this.#clinicas = Array.isArray(value) ? value : [];

    if (this.#clinic) {
      this.#clinic.options = this.#clinicas;
    }
  }

  get roles() {
    return this.#roles;
  }

  set roles(value) {
    this.#roles = Array.isArray(value) ? value : [];

    if (this.#role) {
      this.#role.options = this.#roles;
    }
  }

  get personas() {
    return this.#personas;
  }

  set personas(value) {
    this.#personas = Array.isArray(value) ? value : [];

    if (this.#person) {
      this.#person.options = this.#personas;
    }
  }

  /**
   * Construye la estructura DOM de la tarjeta de inicio de sesión dentro del Shadow DOM
   * (marca institucional, encabezados, tres campos `<ofiuco-auto-complete>`, área de
   * retroalimentación y botón de envío) y enlaza todos los eventos de selección,
   * edición de texto y envío de formulario.
   */
  render() {
    const title = h(
      "h2",
      {
        class: "login-card__title",
      },
      "Acceso",
    );

    const welcome = h(
      "p",
      {
        class: "login-card__welcome",
      },
      "Bienvenido",
    );

    const description = h(
      "p",
      {
        class: "login-card__description",
      },
      "Selecciona tu clínica, rol y persona para continuar.",
    );

    this.#clinic = h("ofiuco-auto-complete", {
      label: "Clínica",
      placeholder: "Selecciona una clínica",
      required: true,
    });

    this.#role = h("ofiuco-auto-complete", {
      label: "Rol",
      placeholder: "Primero selecciona una clínica",
      required: true,
      disabled: true,
    });

    this.#person = h("ofiuco-auto-complete", {
      label: "Persona",
      placeholder: "Primero selecciona un rol",
      required: true,
      disabled: true,
    });

    this.#clinic.options = this.#clinicas;
    this.#role.options = this.#roles;
    this.#person.options = this.#personas;

    this.#feedback = h("p", {
      class: "login-card__feedback",
      role: "status",
      "aria-live": "polite",
    });

    this.#submit = h(
      "button",
      {
        type: "submit",
        class: "login-card__submit",
      },
      "Acceder",
    );

    const formContent = h(
      "div",
      {
        class: "login-card__fields",
      },
      this.#clinic,
      this.#role,
      this.#person,
    );

    this.#form = h(
      "form",
      {
        class: "login-card__form",
      },
      formContent,
      this.#feedback,
      this.#submit,
    );

    const brand = h(
      "div",
      {
        class: "login-card__brand",
      },
      h(
        "span",
        {
          class: "login-card__brand-name",
        },
        "OfiucoSV",
      ),
      h(
        "span",
        {
          class: "login-card__brand-description",
        },
        "Acceso exclusivo para personal autorizado",
      ),
    );

    const content = h(
      "div",
      {
        class: "login-card",
      },
      brand,
      title,
      welcome,
      description,
      this.#form,
    );

    this.shadowRoot.append(content);

    this.#clinic.addEventListener("option-selected", (event) =>
      this.#onClinicSelected(event),
    );

    this.#role.addEventListener("option-selected", (event) =>
      this.#onRoleSelected(event),
    );

    this.#person.addEventListener("option-selected", (event) =>
      this.#onPersonSelected(event),
    );

    this.#clinic.addEventListener("value-changed", () =>
      this.#onClinicChanged(),
    );

    this.#role.addEventListener("value-changed", () => this.#onRoleChanged());

    this.#person.addEventListener("value-changed", () => {
      this.#selected.persona = null;
      this.#clearFeedback();
    });

    this.#form.addEventListener("submit", (event) => this.#onSubmit(event));
  }

  /**
   * Gestiona la selección de una clínica válida: almacena el detalle, reinicia
   * las selecciones dependientes (`rol` y `persona`), habilita el selector de rol
   * y mantiene deshabilitado el de persona.
   *
   * @param {CustomEvent} event - Evento `option-selected` emitido por `#clinic`.
   */
  #onClinicSelected(event) {
    this.#selected.clinica = event.detail;

    this.#selected.rol = null;
    this.#selected.persona = null;

    this.#role.value = "";
    this.#person.value = "";

    this.#role.disabled = false;
    this.#person.disabled = true;

    this.#role.setAttribute("placeholder", "Selecciona un rol");
    this.#person.setAttribute("placeholder", "Primero selecciona un rol");

    this.#clearFeedback();
  }

  /**
   * Gestiona la selección de un rol válido: almacena el detalle, limpia la selección
   * previa de persona y habilita el selector `#person`.
   *
   * @param {CustomEvent} event - Evento `option-selected` emitido por `#role`.
   */
  #onRoleSelected(event) {
    this.#selected.rol = event.detail;
    this.#selected.persona = null;

    this.#person.value = "";
    this.#person.disabled = false;
    this.#person.setAttribute("placeholder", "Selecciona una persona");

    this.#clearFeedback();
  }

  /**
   * Almacena la opción de persona seleccionada y limpia cualquier mensaje de error previo.
   *
   * @param {CustomEvent} event - Evento `option-selected` emitido por `#person`.
   */
  #onPersonSelected(event) {
    this.#selected.persona = event.detail;
    this.#clearFeedback();
  }

  /**
   * Maneja el envío del formulario: verifica que clínica, rol y persona hayan sido
   * seleccionados; de lo contrario muestra un mensaje en `#feedback`. Si todo es válido,
   * despacha el evento `login-requested` con las opciones elegidas.
   *
   * @param {SubmitEvent} event - Evento nativo `submit` del formulario.
   */
  #onSubmit(event) {
    event.preventDefault();

    const { clinica, rol, persona } = this.#selected;

    if (!clinica || !rol || !persona) {
      this.#showFeedback(
        "Debes seleccionar una clínica, un rol y una persona.",
      );
      return;
    }

    this.dispatchEvent(
      new CustomEvent("login-requested", {
        detail: {
          clinica: clinica.option,
          rol: rol.option,
          persona: persona.option,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Muestra un mensaje informativo o de validación en el elemento `#feedback`.
   *
   * @param {string} message - Texto a mostrar al usuario.
   */
  #showFeedback(message) {
    this.#feedback.textContent = message;
  }

  /**
   * Limpia cualquier texto visible en el elemento `#feedback`.
   */
  #clearFeedback() {
    this.#feedback.textContent = "";
  }

  /**
   * Responde a cambios manuales de texto en el campo de clínica invalidando la
   * selección actual y bloqueando/reiniciando los campos dependientes (`rol` y `persona`).
   */
  #onClinicChanged() {
    this.#selected.clinica = null;
    this.#selected.rol = null;
    this.#selected.persona = null;

    this.#role.value = "";
    this.#person.value = "";

    this.#role.disabled = true;
    this.#person.disabled = true;

    this.#role.setAttribute("placeholder", "Primero selecciona una clínica");

    this.#person.setAttribute("placeholder", "Primero selecciona un rol");

    this.#clearFeedback();
  }

  /**
   * Responde a cambios manuales de texto en el campo de rol invalidando la
   * selección actual de rol y bloqueando/reiniciando el campo dependiente (`persona`).
   */
  #onRoleChanged() {
    this.#selected.rol = null;
    this.#selected.persona = null;

    this.#person.value = "";
    this.#person.disabled = true;

    this.#person.setAttribute("placeholder", "Primero selecciona un rol");

    this.#clearFeedback();
  }
}

defineOnce("ofiuco-login-card", OfiucoLoginCard);