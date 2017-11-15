const browserSync = require('../');
// const {Methods} = require('../');

const {bs, init, stop} = browserSync.create();

init({serveStatic: ['.']})
    .subscribe(([errors, output]) => {
        if (errors) {
            return console.log('has errors', errors);
        }

        stop().subscribe(x => console.log('Stopped!'))
    });