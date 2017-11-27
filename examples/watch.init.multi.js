require('source-map-support').install();
const {create, printErrors} = require('../');
const {join} = require('path');

const {bs, init, stop, system} = create();

ac({
    serveStatic: [join(__dirname, '..', 'fixtures')],
    scheme: 'https',
    debug: true
});

setTimeout(() => {
    ac({
        serveStatic: [join(__dirname, '..', 'fixtures')],
        scheme: 'https',
        debug: true,
        watch: {
            active: false
        }
    });
}, 5000);

setTimeout(() => {
    ac({
        serveStatic: [join(__dirname, '..', 'fixtures')],
        scheme: 'https',
        debug: true,
        watch: {
            active: true
        }
    });
}, 10000);

function ac (opts) {
    init(opts)
        .subscribe(([errors,  output]) => {
            if (errors && errors.length) {
                return console.log(printErrors(errors))
            }
            console.log(output.server.address());
        });
}

