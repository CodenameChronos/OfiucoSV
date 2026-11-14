/**
 * Registra un custom element solo si su etiqueta aún no existe, evitando el
 * error de doble registro (módulos importados dos veces, recarga en caliente,
 * pruebas). Misma guarda que ya usa ofiuco-tarjeta-simple.
 *
 * @param {string} tag nombre de la etiqueta (debe contener un guion)
 * @param {CustomElementConstructor} ctor
 */
export function defineOnce(tag, ctor) {
  if (!customElements.get(tag)) {
    customElements.define(tag, ctor);
  }
}
