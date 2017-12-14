const {create, printErrors} = require('../');
// const {Methods} = require('../');

const {bs, init, stop} = create();

init({
    proxy: ['http://example.com'],
    cwd: process.cwd()
})
    .subscribe(([errors, output]) => {
        if (errors && errors.length) {
            console.log(printErrors(errors));
            return;
        }
        console.log(output.server.address());
    });