import * as chai from "../lib/chai/index.js";
import ExamenResultadoService from "../../../src/js/control/examenResultado_service.js";
import ExamenTipoExamenService from "../../../src/js/control/examenTipoExamen_service.js";
import OrdenExamenService from "../../../src/js/control/ordenExamen_service.js";
import ProcedimientoPasoSecuenciaService from "../../../src/js/control/procedimientoPasoSecuencia_service.js";
import ProcedimientoPasoService from "../../../src/js/control/procedimientoPaso_service.js";

const { expect } = chai;
const ID_PADRE = "11111111-1111-4111-8111-111111111111";

describe("servicios de rutas anidadas adicionales", () => {
  const casos = [
    {
      nombre: "ExamenResultadoService",
      crear: () => new ExamenResultadoService(ID_PADRE),
      ruta: `ordenExamen/${ID_PADRE}/resultado`,
      entidad: "ExamenResultado",
    },
    {
      nombre: "ExamenTipoExamenService",
      crear: () => new ExamenTipoExamenService(ID_PADRE),
      ruta: `examen/${ID_PADRE}/tipoExamen`,
      entidad: "ExamenTipoExamen",
    },
    {
      nombre: "OrdenExamenService",
      crear: () => new OrdenExamenService(ID_PADRE),
      ruta: `consultaProcedimientoPaso/${ID_PADRE}/ordenExamen`,
      entidad: "OrdenExamen",
    },
    {
      nombre: "ProcedimientoPasoSecuenciaService",
      crear: () => new ProcedimientoPasoSecuenciaService(ID_PADRE),
      ruta: `procedimiento/${ID_PADRE}/secuencia`,
      entidad: "ProcedimientoPasoSecuencia",
    },
    {
      nombre: "ProcedimientoPasoService",
      crear: () => new ProcedimientoPasoService(ID_PADRE),
      ruta: `procedimiento/${ID_PADRE}/paso`,
      entidad: "ProcedimientoPaso",
    },
  ];

  casos.forEach(({ nombre, crear, ruta, entidad }) => {
    describe(nombre, () => {
      it("construye la ruta anidada correspondiente", () => {
        const service = crear();

        expect(service.URL).to.equal(
          `http://localhost:9080/GalenoSV-1.0-SNAPSHOT/resources/v1/${ruta}`,
        );
      });

      it("configura la entidad correspondiente", () => {
        const service = crear();

        expect(service.EntityClass.name).to.equal(entidad);
      });

      [null, undefined, ""].forEach((idInvalido) => {
        it(`rechaza el identificador obligatorio (${String(idInvalido)})`, () => {
          let crearSinId;
          switch (nombre) {
            case "ExamenResultadoService":
              crearSinId = () => new ExamenResultadoService(idInvalido);
              break;
            case "ExamenTipoExamenService":
              crearSinId = () => new ExamenTipoExamenService(idInvalido);
              break;
            case "OrdenExamenService":
              crearSinId = () => new OrdenExamenService(idInvalido);
              break;
            case "ProcedimientoPasoSecuenciaService":
              crearSinId = () => new ProcedimientoPasoSecuenciaService(idInvalido);
              break;
            default:
              crearSinId = () => new ProcedimientoPasoService(idInvalido);
          }

          expect(crearSinId).to.throw(TypeError);
        });
      });
    });
  });
});
