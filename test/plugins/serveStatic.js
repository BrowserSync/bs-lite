const {ServeStatic} = require('../../dist/plugins/serveStatic');
const {DefaultOptions} = require('../../dist/options');
const {createSystem, fromOptions} = require('../../dist');
const {fromJS, Map} = require('immutable');
const assert = require('assert');

it.only('serveStatic', function (done) {
    const system = createSystem();
    const serveStaticActor = system.actorOf(ServeStatic);
    const opts = fromOptions({
        serveStatic: [
            './fixtures',
            {
                route: '/static',
                dir: ['./fixtures', () => {}]
            }
        ]
    })
        .flatMap(merged => serveStaticActor.ask('init', merged))
        .subscribe(({mw}) => {
            console.log(mw);
            done();
            // mw[0].handle({}, {
            //     setHeader: () => {},
            //     end: (output) => {
            //         done();
            //     }
            // })
        });
});
