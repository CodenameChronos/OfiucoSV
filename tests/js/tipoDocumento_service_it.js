import * as chai from "./lib/chai/index";
import TipoDocumentoService from "../../src/js/boundary/control/tipoDocumento_service";
import DefaultResponse from "../../src/js/boundary/entity/default_response";

mocha.setup("bdd");
describe("TipoDocumentoService", function () {
  var cut;
  it("Should have an instance to test", function () {
    cut = new TipoDocumentoService();
    chai.assert.isDefined(cut);
    chai.expect(cut).to.be.an.instanceOf(TipoDocumentoService);
  });

  it("findRange should return a DefaultResponse with the correct data", function (done) {
    cut
      .findRange(0, 10)
      .then((resp) => {
        chai.expect(resp).to.be.an.instanceOf(DefaultResponse);
        chai.expect(resp.registros).to.be.an("array").that.has.lengthOf(2);
        chai.expect(resp.totalRegistros).to.equal("2");
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
});

mocha.run();
