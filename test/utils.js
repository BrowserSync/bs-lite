const {Observable} = require('rxjs');
const {Methods} = require('../dist');
const assert = require('assert');
const request = require('supertest-as-promised');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

module.exports.serverAssert = function serverAssert(options, path, assertions, createOptions) {
    const {bs, server} = require('../').create(createOptions);
    // console.log(options);
    return bs.ask(Methods.Init, options)
        .flatMap(([errors, output]) => {
            if (errors && errors.length) {
                return Observable.throw(errors[0]);
            }
            return Observable.fromPromise(
                request(output.server)
                    .get(path)
                    .set('accept', 'text/html')
            )
                .map((resp) => [resp, output.options])
        })
        .do(([resp, options]) => assertions(resp, options))
        .catch(err => Observable.concat(bs.ask(Methods.Stop), Observable.throw(err)))
        .flatMap(() => bs.ask(Methods.Stop))
}


module.exports.getHttpsApp = function() {
    const https = require("https");
    const connect = require("connect");
    const {readFileSync} = require('fs');

    const app = connect();
    const httpsOptions = {
        key: readFileSync('server/certs/server.key'),
        cert: readFileSync('server/certs/server.crt')
    };

    const server = https.createServer(httpsOptions, app);
    server.listen();

    const url = `https://localhost:${server.address().port}`;
    return {app, url, server};
}