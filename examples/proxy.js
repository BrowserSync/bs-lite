const browserSync = require('../');
// const {Methods} = require('../');

const {bs, init, stop} = browserSync.create();

init({proxy: ['http://example.com']})
    .subscribe(([errors, output]) => {
        if (errors) {
            return console.log('has errors', errors);
        }
        console.log(output.server.address());
    });