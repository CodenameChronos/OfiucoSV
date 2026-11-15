import * as chai from "../js/lib/chai/index";
import TipoDocumentoService from "../../src/js/boundary/control/tipoDocumento_service";
import sinon from "../js/lib/sinon/sinon-esm";

mocha.setup("tdd");
var stubFetch = sinon.stub(window, "fetch").resolves(
  new Response(
    JSON.stringify([
      {
        activo: true,
        expresionRegular: "^\\d{8}-\\d$",
        expresionRegularValida: true,
        idTipoDocumento: "603c0cc8-751b-48cb-8bcc-2ae804174ba4",
        indicaciones: "-",
        nombre: "dui",
      },
      {
        activo: true,
        expresionRegular: "^\\d{5}$",
        expresionRegularValida: true,
        idTipoDocumento: "8c37954d-0d97-4d41-bfd7-18eb76ad43a6",
        indicaciones: "---",
        nombre: "due",
      },
    ]),
    { status: 200, headers: { "Total-registros": 2 } },
  ),
);

suite("TipoDocumentoService", function () {
  test("TipoDocumento should return a DefaultResponse with the correct data", function (done) {
    let service = new TipoDocumentoService();
    service
      .findRange(0, 10)
      .then((resp) => {
        chai.expect(resp).to.be.an.instanceOf(Object);
        chai.expect(resp).to.be.an("array").that.has.lengthOf(2);
        chai.expect(resp.totalRegistros).to.equal("2");
        stubFetch.restore();
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});

mocha.run();
