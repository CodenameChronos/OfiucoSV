
mocha.setup("bdd");

// Compatibilidad con los tests que utilizan la interfaz TDD.
window.suite = window.describe;
window.test = window.it;
window.setup = window.beforeEach;
window.teardown = window.afterEach;

// Cargar las pruebas en una única suite.
await import("./js/control/clinica_service_test.js");
await import("./js/control/consulta_service_test.js");
await import("./js/control/consulta_service_findById_test.js");
await import("./js/control/dashboard_service_test.js");
await import("./js/control/default_service_test.js");
await import("./js/control/estado_paso_test.js");
await import("./js/control/indicaciones_service_test.js");
await import("./js/control/login_service_test.js");
await import("./js/control/observaciones_service_test.js");
await import("./js/control/personaRol_service_test.js");
await import("./js/control/procedimientoPasoExamen_service_test.js");
await import("./js/control/reglas_consulta_seleccion_test.js");
await import("./js/control/reglas_consulta_test.js");
await import("./js/control/rutas_anidadas_adicionales_test.js");
await import("./js/control/rutas_anidadas_service_test.js");
await import("./js/control/secuencia_service_test.js");

// Ejecutar todas las pruebas una sola vez.
mocha.run();
