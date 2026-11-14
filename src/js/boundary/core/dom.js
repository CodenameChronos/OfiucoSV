/**
 * Crea un elemento con atributos y contenido.
 *
 * Los hijos de tipo string se insertan como nodos de texto (nunca como HTML),
 * por lo que es seguro usarlo con datos provenientes del backend.
 *
 * @param {string} tag nombre de la etiqueta (nativa o de un custom element)
 * @param {Record<string, string|boolean|null|undefined>} [attrs] atributos;
 *        `true` crea un atributo booleano, `false`/`null`/`undefined` lo omite
 * @param {...(Node|string)} children
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    node.setAttribute(name, value === true ? "" : String(value));
  }
  node.append(...children);
  return node;
}
