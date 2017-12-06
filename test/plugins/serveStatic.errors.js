const {Observable} = require('rxjs');
const {Methods} = require('../../dist');
const assert = require('assert');
const request = require('supertest-as-promised');
const serverAssert = require("../utils").serverAssert;

const {concat} = Observable;

it('serveStatic', function (done) {

    const {BSErrorType, BSErrorLevel, printErrors, create} = require('../../');

    const {bs, init, stop} = create('test');

    init({serveStatic: () => {}})
        .subscribe(([errors]) => {
            assert.equal(errors[0].type, BSErrorType.ServeStaticInput);
            stop().subscribe(() => {
                done();
            })
        })
});
