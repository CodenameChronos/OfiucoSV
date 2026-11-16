import "../primitives/ofiuco-auto-complete.js";
import { BaseComponent } from "../../core/base-component.js";
import { defineOnce } from "../../core/define-once.js";
import { h } from "../../core/dom.js";

export class OfiucoLoginCard extends BaseComponent {
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

  #onRoleSelected(event) {
    this.#selected.rol = event.detail;
    this.#selected.persona = null;

    this.#person.value = "";
    this.#person.disabled = false;
    this.#person.setAttribute("placeholder", "Selecciona una persona");

    this.#clearFeedback();
  }

  #onPersonSelected(event) {
    this.#selected.persona = event.detail;
    this.#clearFeedback();
  }

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

  #showFeedback(message) {
    this.#feedback.textContent = message;
  }

  #clearFeedback() {
    this.#feedback.textContent = "";
  }

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
