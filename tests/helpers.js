/** Utilidades de prueba: contenedor aislado para montar componentes. */
const holder = document.createElement("section");
holder.id = "fixture";
document.body.append(holder);

/** Crea un elemento con atributos, lo monta y lo devuelve. */
export function mount(tag, attrs = {}) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs))
    el.setAttribute(name, value);
  holder.append(el);
  return el;
}

/** Desmonta todo (dispara disconnectedCallback). Usar en afterEach. */
export function unmountAll() {
  holder.replaceChildren();
}
