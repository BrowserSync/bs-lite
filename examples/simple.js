require('source-map-support').install();
const {create, printErrors} = require('../');
const {join} = require('path');

const {bs, init, stop} = create();

init({
    serveStatic: ['/Users/shakyshane/Sites/jh/m2-perf-work/public'],
    debug: true
})
    .subscribe(([errors,  output]) => {
        if (errors) {
            return console.log(printErrors(errors))
        }
        console.log(output.server.address());
    });
