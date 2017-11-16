require('source-map-support').install();
const {getHttpsApp} = require("../utils");
const assert = require('assert');
const serverAssert = require("../utils").serverAssert;

it('can proxy https site', function (done) {

    const {app, server, url} = getHttpsApp();

    app.use('/', function(req, res) {
        res.end(`<h1><a href="${url}/about">About</a></h1>`);
    });

    const asserts = (resp, options) => {
        const bsPort = options.getIn(['server', 'port']);
        const expectedUrl = `//127.0.0.1:${bsPort}`;
        const expected = `<h1><a href="${expectedUrl}/about">About</a></h1>`;
        assert.equal(resp.text, expected);
    };

    serverAssert({proxy: [url], scheme: 'https'}, '/', asserts)
        .do(() => server.close())
        .subscribe(() => done(), err => done(err));
});

it('can proxy https site with multiple proxies', function (done) {

    const {app, server, url} = getHttpsApp();

    app.use('/', function(req, res) {
        res.end([
            '<h1>',
            `<a href="${url}/about">About</a>`,
            `<a href="https://example.com">Back</a>`,
            '</h1>'
        ].join(''));
    });

    const asserts = (resp, options) => {
        const bsPort = options.getIn(['server', 'port']);
        const expectedUrl = `//127.0.0.1:${bsPort}`;
        const expected = [
            '<h1>',
                `<a href="${expectedUrl}/about">About</a>`,
                `<a href="${expectedUrl}">Back</a>`,
            '</h1>'
        ].join('');

        assert.equal(resp.text, expected);
    };

    serverAssert({proxy: [url, 'https://example.com'], scheme: 'https'}, '/', asserts)
        .do(() => server.close())
        .subscribe(() => done(), err => done(err));
});

it('can proxy https sites with mixed schemes', function (done) {

    const {app, server, url} = getHttpsApp();

    app.use('/', function(req, res) {
        res.end([
            '<h1>',
            `<a href="${url}/about">About</a>`,
            `<a href="https://example.com">Secure</a>`,
            `<a href="http://example.com">Insecure</a>`,
            '</h1>'
        ].join(''));
    });

    const asserts = (resp, options) => {
        const bsPort = options.getIn(['server', 'port']);
        const expectedUrl = `//127.0.0.1:${bsPort}`;
        const expected = [
            '<h1>',
                `<a href="${expectedUrl}/about">About</a>`,
                `<a href="${expectedUrl}">Secure</a>`,
                `<a href="${expectedUrl}">Insecure</a>`,
            '</h1>'
        ].join('');

        assert.equal(resp.text, expected);
    };

    serverAssert({
        proxy: [url, 'https://example.com', 'http://example.com'],
        scheme: 'https'
    }, '/', asserts)
        .do(() => server.close())
        .subscribe(() => done(), err => done(err));
});