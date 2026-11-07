const templateUrl = new URL(
    "../../../../html/components/login.html",
    import.meta.url
);

const stylesUrl = new URL(
    "../../../../css/components/login.css",
    import.meta.url
);

// Datos ficticios para el demo
const clinicas = [
    {
        nombre: "Clínica Central",
        roles: [
            {
                nombre: "Administrador",
                personas: ["Carlos Martínez", "Ana López"]
            },
            {
                nombre: "Médico",
                personas: ["Roberto Hernández", "María García"]
            },
            {
                nombre: "Enfermería",
                personas: ["Sofía Ramírez"]
            }
        ]
    },
    {
        nombre: "Clínica Norte",
        roles: [
            {
                nombre: "Médico",
                personas: ["Daniel Castro"]
            },
            {
                nombre: "Enfermería",
                personas: ["Lucía Morales"]
            }
        ]
    },
    {
        nombre: "Clínica San Miguel",
        roles: [
            {
                nombre: "Administrador",
                personas: ["Pedro Ramírez"]
            },
            {
                nombre: "Médico",
                personas: ["Elena Flores"]
            }
        ]
    }
];

class GalenoLogin extends HTMLElement {

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    async connectedCallback() {
        try {
            const [html, css] = await Promise.all([
                fetch(templateUrl).then(response => response.text()),
                fetch(stylesUrl).then(response => response.text())
            ]);

            this.shadowRoot.innerHTML = `
                <style>${css}</style>
                ${html}
            `;

            this.initialize();

        } catch (error) {
            console.error("Error al cargar el login:", error);
            this.shadowRoot.textContent =
                "No se pudo cargar el inicio de sesión.";
        }
    }

    initialize() {
        this.clinica = null;
        this.rol = null;
        this.persona = null;

        this.fields = {
            clinica: this.getField("clinica"),
            rol: this.getField("rol"),
            persona: this.getField("persona")
        };

        this.feedback = this.shadowRoot.querySelector("#feedback");

        this.configureFields();
        this.configureButtons();
    }

    getField(name) {
        return {
            input: this.shadowRoot.querySelector(`#${name}`),
            options: this.shadowRoot.querySelector(`#${name}-options`)
        };
    }

    // Configuración de los tres campos
    configureFields() {

        const { clinica, rol, persona } = this.fields;

        clinica.input.addEventListener("input", () => {
            this.clinica = null;
            this.resetRol();
            this.resetPersona();

            this.search(
                clinica,
                clinicas,
                "nombre",
                2,
                item => {
                    this.clinica = item;
                    rol.input.disabled = false;
                    rol.input.placeholder = "Buscar rol...";
                    rol.input.focus();
                }
            );
        });

        rol.input.addEventListener("input", () => {
            this.rol = null;
            this.resetPersona();

            this.search(
                rol,
                this.clinica?.roles || [],
                "nombre",
                1,
                item => {
                    this.rol = item;
                    persona.input.disabled = false;
                    persona.input.placeholder = "Buscar persona...";
                    persona.input.focus();
                }
            );
        });

        persona.input.addEventListener("input", () => {
            this.persona = null;

            this.search(
                persona,
                this.rol?.personas || [],
                null,
                1,
                item => {
                    this.persona = item;
                }
            );
        });
    }

    // Función reutilizable de autocompletado
    search(field, data, property, minLength, onSelect) {

        const query = field.input.value.trim().toLowerCase();

        field.options.replaceChildren();

        if (query.length < minLength) return;

        const results = data.filter(item => {
            const value = property ? item[property] : item;
            return value.toLowerCase().includes(query);
        });

        results.forEach(item => {
            const value = property ? item[property] : item;
            const button = document.createElement("button");

            button.type = "button";
            button.textContent = value;

            button.addEventListener("click", () => {
                field.input.value = value;
                field.options.replaceChildren();
                onSelect(item);
                this.hideFeedback();
            });

            field.options.appendChild(button);
        });
    }

    // Limpiar campos dependientes
    resetRol() {
        const field = this.fields.rol;

        this.rol = null;
        field.input.value = "";
        field.input.disabled = true;
        field.input.placeholder = "Selecciona una clínica primero";
        field.options.replaceChildren();
    }

    resetPersona() {
        const field = this.fields.persona;

        this.persona = null;
        field.input.value = "";
        field.input.disabled = true;
        field.input.placeholder = "Selecciona un rol primero";
        field.options.replaceChildren();
    }

    // Botones y formularios
    configureButtons() {

        this.shadowRoot.querySelector("#login-form")
            .addEventListener("submit", event => {

                event.preventDefault();

                if (!this.clinica || !this.rol || !this.persona) {
                    this.showFeedback("Completa y selecciona los tres campos.");
                    return;
                }

                this.startSession();
            });

        this.shadowRoot.querySelector("#logout-button")
            .addEventListener("click", () => this.endSession());
    }

    startSession() {

        this.shadowRoot.querySelector("#session-persona").textContent =
            this.persona;

        this.shadowRoot.querySelector("#session-rol").textContent =
            this.rol.nombre;

        this.shadowRoot.querySelector("#session-clinica").textContent =
            this.clinica.nombre;

        this.shadowRoot.querySelector("#login-view").hidden = true;
        this.shadowRoot.querySelector("#session-view").hidden = false;
    }

    endSession() {

        this.clinica = null;
        this.rol = null;
        this.persona = null;

        this.fields.clinica.input.value = "";
        this.fields.rol.input.value = "";
        this.fields.persona.input.value = "";

        this.resetRol();
        this.resetPersona();
        this.hideFeedback();

        this.shadowRoot.querySelector("#session-view").hidden = true;
        this.shadowRoot.querySelector("#login-view").hidden = false;
    }

    showFeedback(message) {
        this.feedback.textContent = message;
        this.feedback.hidden = false;
    }

    hideFeedback() {
        this.feedback.textContent = "";
        this.feedback.hidden = true;
    }
}

if (!customElements.get("galeno-login")) {
    customElements.define("galeno-login", GalenoLogin);
}