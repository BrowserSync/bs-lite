require('source-map-support').install();
const {create, printErrors, WatcherMessages} = require('../');
const {join} = require('path');

const {bs, init, stop, system} = create();

ac({
    serveStatic: [join(__dirname, '..', 'fixtures')],
    scheme: 'https',
    debug: true
});

setTimeout(() => {
    const a = system.actorSelection('core/watcher')[0];
    a.tell(WatcherMessages.Deactivate).subscribe();
}, 5000);

setTimeout(() => {
    const a = system.actorSelection('core/watcher')[0];
    a.tell(WatcherMessages.Activate).subscribe();
}, 10000);

function ac (opts) {
    init(opts)
        .subscribe(([errors,  output]) => {
            if (errors && errors.length) {
                return console.log(printErrors(errors))
            }
            console.log(output.server.address());
        });
}

