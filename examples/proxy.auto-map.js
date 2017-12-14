require('source-map-support').install();
const {create, printErrors} = require('../');
const {bs, init, stop} = create();

init({
    proxy: 'http://ce.demo.wearejh.com',
    strict: true,
    cwd: process.cwd(),
})
    .subscribe(([errors, output]) => {
        if (errors) {
            return console.log(printErrors(errors));
        }
        console.log(output.server.address());
    });
