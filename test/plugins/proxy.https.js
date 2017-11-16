require('source-map-support').install();
const {DefaultOptions} = require('../../dist/options');
const {createSystem, fromOptions} = require('../../dist');
const {fromJS, Map} = require('immutable');
const assert = require('assert');
const https = require("https");
const connect = require("connect");
const serverAssert = require("../utils").serverAssert;
const {init, Methods} = require('../../');
const {createWithOptions} = require('../../dist/Browsersync.init');

it.only('can proxy https site', function (done) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    const app = connect();

    const server = https.createServer(app);
    server.listen();

    const url = `https://localhost:${server.address().port}`;

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

    serverAssert({proxy: [url], scheme: 'https'}, '/', asserts)
        .do(() => server.close())
        .subscribe(() => {
            done();
        }, err => done(err));
});