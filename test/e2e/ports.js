const {ServeStatic} = require('../../dist/plugins/serveStatic');
const {DefaultOptions} = require('../../dist/options');
const {createSystem, fromOptions, init, Methods} = require('../../dist');
const {fromJS, Map} = require('immutable');
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
        })
    // const opts = fromOptions({
    //     serveStatic: [
    //         './fixtures',
    //         {
    //             route: '/static',
    //             dir: ['./fixtures', './src']
    //         }
    //     ]
    // })
    //     .flatMap(merged => serveStaticActor.ask('init', merged))
    //     .subscribe(({mw}) => {
    //         // console.log(mw);
    //         done();
    //         // mw[0].handle({}, {
    //         //     setHeader: () => {},
    //         //     end: (output) => {
    //         //         done();
    //         //     }
    //         // })
    //     });
});
