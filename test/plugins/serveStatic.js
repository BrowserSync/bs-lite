const {Observable} = require('rxjs');
const {Methods} = require('../../dist');
const assert = require('assert');
const request = require('supertest-as-promised');
const serverAssert = require("../utils").serverAssert;

it('serveStatic', function (done) {

    const req = '/';
    const asserts = (resp, options) => {
        assert.equal(resp.text.indexOf(`<h1>Test from './fixtures/index.html'</h1>`) > -1, true, 'fixtures/index.html');
        assert.equal(resp.text.indexOf(options.get('snippet')) > -1, true, 'Snippet');
    };

    serverAssert({serveStatic: ['fixtures']}, req, asserts)
        .subscribe(() => done(), err => done(err));
});
