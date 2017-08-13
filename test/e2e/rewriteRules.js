const {Methods} = require('../../dist');
const assert = require('assert');
const {Observable} = require('rxjs');
const request = require('supertest-as-promised');
const serverAssert = require("../utils").serverAssert;
const connect = require('connect');
const http = require('http');
const {join} = require('path');

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

it('allows rewrite rules on proxied serve static files', function (done) {

    const app = connect();
    const server = http.createServer(app);
    server.listen();

    const url = `http://localhost:${server.address().port}`;

    app.use(require('serve-static')(join(__dirname, '..', '..', 'fixtures')));

    const options = {
        proxy: [url],
        rewriteRules: [{
            predicates: [(req) => req.url === '/js/react.js'],
            fn: () => 'NOOP!'
        }]
    };

    const req = '/js/react.js';
    const asserts = (resp, options) => {
        assert.equal(resp.text, 'NOOP!');
    }
    serverAssert(options, req, asserts)
        .subscribe(() => done(), err => done(err));
});
