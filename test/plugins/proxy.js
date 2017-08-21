require('source-map-support').install();
const {BrowsersyncProxy, createFromString, createItemFromString} = require('../../dist/plugins/proxy');
const {DefaultOptions} = require('../../dist/options');
const {createSystem, fromOptions} = require('../../dist');
const {fromJS, Map} = require('immutable');
const assert = require('assert');
const http = require("http");
const connect = require("connect");
const serverAssert = require("../utils").serverAssert;
const {init, Methods} = require('../../');
const {createWithOptions} = require('../../dist/Browsersync.init');

it('proxy', function (done) {
    const app = connect();

    const server = http.createServer(app);
    server.listen();

    const url = `http://localhost:${server.address().port}`;

    app.use('/', function(req, res) {
        // language=HTML
        res.end(`<!doctype html>
<html lang="en">
<head>
    <title>Document</title>
</head>
<body>
    <h1><a href="${url}/about">About</a></h1>
</body>
</html>`)
    });

    const asserts = (resp, options) => {
        const bsPort = options.getIn(['server', 'port']);
        assert.equal(resp.text.indexOf(`<h1><a href="//127.0.0.1:${bsPort}/about">About</a></h1>`) > -1, true)
    }

    serverAssert({proxy: [url]}, '/', asserts)
        .do(() => server.close())
        .subscribe(() => {
            done();
        }, err => done(err));
});
it('proxy (multiple)', function (done) {
    const app = connect();

    const server = http.createServer(app);
    server.listen();

    const url = `http://localhost:${server.address().port}`;

    app.use('/', function(req, res) {
        // language=HTML
        res.end(`<!doctype html>
<html lang="en">
<head>
    <title>Document</title>
</head>
<body>
    <h1><a href="${url}/about">About</a></h1>
    <h1><a href="http://example.com">EXX</a></h1>
</body>
</html>`)
    });

    const asserts = (resp, options) => {
        const bsPort = options.getIn(['server', 'port']);
        assert.equal(resp.text.indexOf(`<h1><a href="//127.0.0.1:${bsPort}/about">About</a></h1>`) > -1, true)
        assert.equal(resp.text.indexOf(`<h1><a href="//127.0.0.1:${bsPort}">EXX</a></h1>`) > -1, true)
    };

    serverAssert({proxy: [url, 'http://example.com']}, '/', asserts)
        .do(() => server.close())
        .subscribe(() => {
            done();
        }, err => done(err));
});
it('proxy (given as object + target prop only)', function (done) {
    const app = connect();

    const server = http.createServer(app);
    server.listen();

    const url = `http://localhost:${server.address().port}`;

    app.use('/', function(req, res) {
        // language=HTML
        res.end(`<!doctype html>
<html lang="en">
<head>
    <title>Document</title>
</head>
<body>
    <h1><a href="${url}/about">About</a></h1>
    <h1><a href="http://example.com">EXX</a></h1>
</body>
</html>`)
    });

    const asserts = (resp, options) => {
        const bsPort = options.getIn(['server', 'port']);
        assert.equal(resp.text.indexOf(`<h1><a href="//127.0.0.1:${bsPort}/about">About</a></h1>`) > -1, true)
        assert.equal(resp.text.indexOf(`<h1><a href="//127.0.0.1:${bsPort}">EXX</a></h1>`) > -1, true)
    };

    serverAssert({
        proxy: [
            url,
            {
                target: 'http://example.com'
            },
        ]
    }, '/', asserts)
        .do(() => server.close())
        .subscribe(() => {
            done();
        }, err => done(err));
});
