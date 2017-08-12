const {Observable} = require('rxjs');
const {Methods} = require('../dist');
const assert = require('assert');
const request = require('supertest-as-promised');

module.exports.serverAssert = function serverAssert(options, path, assertions) {
    const {bs, server} = require('../dist').init();
    return bs.ask(Methods.Init, options)
        .flatMap(({errors, output}) => {
            if (errors.length) {
                return Observable.throw(errors[0]);
            }
            return Observable.fromPromise(
                request(output.server)
                    .get(path)
                    .set('accept', 'text/html')
            )
                .map((resp) => [resp, output.options])
        })
        .catch(err => Observable.concat(bs.ask(Methods.Stop), Observable.throw(err)))
        .do(([resp, options]) => assertions(resp, options))
        .flatMap(() => bs.ask(Methods.Stop))
}