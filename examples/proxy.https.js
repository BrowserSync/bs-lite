const {create, printErrors} = require('../');
// const {Methods} = require('../');

const {bs, init, stop} = create();

init({proxy: ['https://example.com'], server: {port: 3000}, strict: true})
    .subscribe(([errors, output]) => {
        if (errors) {
            return console.log(printErrors(errors));
        }
        console.log(output.server.address());
    });