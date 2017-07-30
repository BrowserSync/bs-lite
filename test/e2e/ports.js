const {Methods} = require('../../dist');
const assert = require('assert');
const {Observable} = require('rxjs');


it('will provide server and options output', function (done) {
    // console.log('ere');
    const {bs, server} = require('../../dist').init();
    Observable.concat(
        bs.ask(Methods.Init, {strict: true}),
        bs.ask(Methods.Stop),
        bs.ask(Methods.Listening)
    )
        .toArray()
        .subscribe(x => {
            assert.equal(x[2], false);
            done();
        }, err => {
            done(err);
        });
});
