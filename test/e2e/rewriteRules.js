const {Methods} = require('../../dist');
const assert = require('assert');
const {Observable} = require('rxjs');
const request = require('supertest-as-promised');
const serverAssert = require("../utils").serverAssert;

it('will allow rewrite rules + core snippet', function (done) {
    const options = {
        rewriteRules: [(req, res, html) => html + '<!--oops!-->']
    };
    const req = '/';
    const asserts = (resp, options) => {
        assert.equal(resp.text.indexOf('<!--oops!-->') > -1, true);
        assert.equal(resp.text.indexOf(options.get('snippet')) > -1, true);
    }
    serverAssert(options, req, asserts)
        .subscribe(() => done(), err => done(err));
});
