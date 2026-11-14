/**
 * Registro de íconos propios (SVG 24x24, trazo). El contenido es estático y
 * confiable; nunca se construye a partir de datos externos.
 * El ícono `logo` es un marcador de posición: reemplazar por el logo real.
 */
export const ICONS = Object.freeze({
  logo: '<path d="M12 2v20"/><path d="M8.5 5.5c5-1 6.5 2.5 3.5 4.5s-3.5 4.5 3.5 6.5"/>',
  login:
    '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
});
