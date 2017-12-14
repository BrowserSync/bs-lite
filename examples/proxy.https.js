const {create, printErrors} = require('../');
// const {Methods} = require('../');

const {bs, init, stop} = create();

init({
    proxy: ['https://example.com'],
    strict: true,
    cwd: process.cwd()
})
    .subscribe(([errors, output]) => {
        if (errors) {
            return console.log(printErrors(errors));
        }
        console.log(output.server.address());
    });