const {Methods} = require('../../dist');
const assert = require('assert');
const {Observable} = require('rxjs');


it('will provide server and options output', function (done) {
    // console.log('ere');
    const {bs, server} = require('../../dist').create();
    Observable.concat(
        bs.ask(Methods.Init, {strict: true}),
        bs.ask(Methods.Stop),
        bs.ask(Methods.Listening)
    )
        .toArray()
        .subscribe(x => {
            const listening = x[2];
            const [errs, output] = listening;
            assert.equal(output, false);
            done();
        }, err => {
            done(err);
        });
});
