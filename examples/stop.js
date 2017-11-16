const browserSync = require('../');
const {join} = require('path');
// const {Methods} = require('../');

const {bs, init, stop} = browserSync.create();

init({serveStatic: [join(__dirname, '..', 'fixtures')]})
    .subscribe(([errors, output]) => {
        if (errors) {
            return console.log('has errors', errors);
        }
        stop().subscribe(() => console.log('Stopped!'))
    });