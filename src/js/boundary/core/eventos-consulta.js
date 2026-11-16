/**
 * @file Contrato de eventos de la pantalla de consulta (HU4).
 *
 * Los botones emiten estas solicitudes con bubbles y composed; PageConsulta
 * las escucha y decide qué método del AtencionService invocar. Los botones
 * nunca ejecutan lógica de negocio.
 */
export const ConsultaEventos = Object.freeze({
  GUARDAR: "ofiuco:guardar",
  PASO_SIGUIENTE: "ofiuco:paso-siguiente",
  PASO_ANTERIOR: "ofiuco:paso-anterior",
  REGRESAR: "ofiuco:regresar",
  FINALIZAR: "ofiuco:finalizar-consulta",
  QUITAR_EXAMEN: "ofiuco:quitar-examen",
});
