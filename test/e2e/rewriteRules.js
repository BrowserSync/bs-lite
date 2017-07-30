const {Methods} = require('../../dist');
const assert = require('assert');
const {Observable} = require('rxjs');
const request = require('supertest-as-promised');

it('will allow rewrite rules + core snippet', function (done) {
    const {bs, server} = require('../../dist').init();
    bs.ask(Methods.Init, {
        rewriteRules: [(req, res, html) => html + '<!--oops!-->']
    })
        .flatMap(({errors, output}) => {
            if (errors.length) {
                return Observable.throw(errors[0]);
            }
            return Observable.fromPromise(request(output.server)
                .get('/')
                .set('accept', 'text/html'))
                .map((resp) => [resp, output.options])
        })
        .flatMap(([resp, options]) => {
            if (resp.text.indexOf('<!--oops!-->') === -1) {
                return Observable.throw(new Error('Missing rewriteRule'))
            }
            if (resp.text.indexOf(options.get('snippet')) === -1) {
                return Observable.throw(new Error('Missing snippet'))
            }
            return Observable.of(true)
        })
        .subscribe((output) => {
            done()
        }, err => {
            done(err);
        });
});
