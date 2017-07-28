const {ServeStatic} = require('../../dist/plugins/serveStatic');
const {DefaultOptions} = require('../../dist/options');
const {createSystem, fromOptions, init} = require('../../dist');
const {fromJS, Map} = require('immutable');
const assert = require('assert');

it('will propogate errors from port lookup', function (done) {
    // console.log('ere');
    const {bs, server} = require('../../dist').init();
    bs.ask('init', {strict: true})
        .subscribe(({output, errors}) => {
            if (errors.length) {

            } else {
                const {server, options} = output;
                console.log('here', server.address().port);
            }
            done();
        }, err => {
            console.log('err');
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
