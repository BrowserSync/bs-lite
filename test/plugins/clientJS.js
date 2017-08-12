const {Observable} = require('rxjs');
const request = require('supertest-as-promised');
const assert = require('assert');
const serverAssert = require("../utils").serverAssert;

it('converts ClientJS incoming options into a mw', function (done) {
    const path = '/browser-sync/browser-sync-client.js';
    const options = {
        clientJS: [
            'console.log("kittens 1")',
            () => 'console.log("kittens 2")',
            'file:./fixtures/test.js'
        ]
    };
    const asserts = (resp, options) => {
        assert.equal(resp.text.indexOf(`console.log('Another thing');`) > -1, true, 'fixtures/test.js');
        assert.equal(resp.text.indexOf(`console.log("kittens 2")`) > -1, true, 'inline function');
    }
    serverAssert(options, path, asserts)
        .subscribe(() => done(), err => done(err));
});
