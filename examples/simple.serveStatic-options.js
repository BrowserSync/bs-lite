require('source-map-support').install();
const {create, printErrors} = require('../');
const {Observable} = require('rxjs');
const {join} = require('path');

const {bs, init, stop, system} = create();

const config = {
    serveStatic: [{
        dir: [join(__dirname, '..', 'fixtures')],
        options: {
            extensions: ['html']
        }
    }]
};

init(config)
    .subscribe(([errors, output]) => {
        if (errors) {
            return console.log(printErrors(errors))
        }
        console.log(output.server.address());
        setTimeout(() => {
            stop().subscribe(() => {
                console.log('stopped');
            });
        }, 3000);
    });