require('source-map-support').install();
const {getHttpsApp} = require("../utils");
const assert = require('assert');
const serverAssert = require("../utils").serverAssert;

it('can proxy + rewrite rules', function (done) {

    const {app, server, url} = getHttpsApp();

    app.use('/', function(req, res) {
        res.end([
            '<h1>',
            `<a href="${url}/about">About</a>`,
            '</h1>'
        ].join(''));
    });

    const asserts = (resp, options) => {
        const bsPort = options.getIn(['server', 'port']);
        const expectedUrl = `//127.0.0.1:${bsPort}`;
        const expected = [
            '<H1>',
                `<a href="${expectedUrl}/about">About</a>`,
            '</H1>'
        ].join('');

        assert.equal(resp.text, expected);
    };

    serverAssert({
        cwd: process.cwd(),
        proxy: [url],
        scheme: 'https',
        rewriteRules: [
            (req, res, data) => data.replace('h1', 'H1'),
            (req, res, data) => data.replace('/h1', '/H1'),
        ]
    }, '/', asserts)
        .do(() => server.close())
        .subscribe(() => done(), err => done(err));
});

it('can proxy + skip rewrite rules with predicate', function (done) {

    const {app, server, url} = getHttpsApp();

    app.use('/', function(req, res) {
        res.end([
            '<h1>',
            `<a href="${url}/about">About</a>`,
            '</h1>'
        ].join(''));
    });

    const asserts = (resp, options) => {
        const bsPort = options.getIn(['server', 'port']);
        const expectedUrl = `//127.0.0.1:${bsPort}`;
        const expected = [
            '<h1>', // unchanged here because of predicate
                `<a href="${expectedUrl}/about">About</a>`,
            '</h1>'
        ].join('');

        assert.equal(resp.text, expected);
    };

    serverAssert({
        cwd: process.cwd(),
        proxy: [url],
        scheme: 'https',
        rewriteRules: [
            {
                fn: (req, res, data) => data.replace('h1', 'H1'),
                predicates: (req, res, data) => req.url !== '/'
            },
        ]
    }, '/', asserts)
        .do(() => server.close())
        .subscribe(() => done(), err => done(err));
});