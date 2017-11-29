require('source-map-support').install();

/**
 *
 * This example show watch + files options used together
 *
 * bs-lite
 *
 */
const {create, printErrors} = require('../');
const {join} = require('path');

const {bs, init, stop} = create();

init({
    serveStatic: [join(__dirname, '..', 'fixtures')],
    scheme: 'https',
    watch: {
        active: true,
    },
    files: [__dirname],
    // serveStatic: ['/Users/shakyshane/sites/jh/m2-perf/public'],
    debug: true
})
    .subscribe(([errors,  output]) => {
        if (errors) {
            return console.log(printErrors(errors))
        }
        console.log(output.server.address());
    });
