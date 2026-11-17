/**
 * @file Contrato de eventos de la pantalla de consulta (HU4).
 *
 * Los componentes son presentacionales: emiten estas solicitudes con bubbles y
 * composed; PageConsulta las escucha, actualiza el borrador y decide qué método
 * del AtencionService invocar. Ningún componente modifica el borrador.
 *
 * SALIR es el único evento que PageConsulta emite hacia afuera (la shell lo
 * escucha para volver al dashboard) y solo lo emite tras resolver los cambios
 * sin guardar.
 */
export const ConsultaEventos = Object.freeze({
  GUARDAR: "ofiuco:guardar",
  PASO_SIGUIENTE: "ofiuco:paso-siguiente",
  PASO_ANTERIOR: "ofiuco:paso-anterior",
  REGRESAR: "ofiuco:regresar",
  FINALIZAR: "ofiuco:finalizar-consulta",
  QUITAR_EXAMEN: "ofiuco:quitar-examen",
  EXAMEN_AGREGADO: "ofiuco:examen-agregado",
  EXAMEN_SELECCIONADO: "ofiuco:examen-seleccionado",
  RESULTADO_CAMBIADO: "ofiuco:resultado-cambiado",
  SALIR: "ofiuco:consulta-salir",
});