require('source-map-support').install();
const {create, printErrors} = require('../');
const {join} = require('path');

const {bs, init, stop, system} = create();

init({serveStatic: [join(__dirname, '..', 'fixtures')]})
    .subscribe(([errors, output]) => {
        if (errors) {
            return console.log(printErrors(errors))
        }
        console.log(output.server.address());

        const w = system.actorSelection('core/watcher')[0];

        w.ask('AddItems', {ns: 'core', items: ['watch.js']}).subscribe();

        setTimeout(() => {
            stop().subscribe(() => {
                console.log('stopped!');
            })
        }, 5000);
    });