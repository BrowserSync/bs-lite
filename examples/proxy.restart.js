const browserSync = require('../');
// const {Methods} = require('../');

const {init} = browserSync.create();

function start(options) {
    init(options)
        .subscribe(([errors, output]) => {
            if (errors) {
                return console.log('has errors', errors);
            }
            console.log(output.server.address());
        });
}

start({proxy: ['http://example.com']});

setTimeout(() => {
    start({proxy: ['https://example.com']});
}, 5000);

