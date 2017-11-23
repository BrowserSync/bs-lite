require('source-map-support').install();
const assert = require('assert');
const {TestScheduler} = require('@kwonoj/rxjs-testscheduler-compat');
const {BSErrorType, BSErrorLevel, printErrors} = require('../../');

it.only('Gives errors about strict mode when no matching port is found', function (done) {

    const scheduler = new TestScheduler();
    const browserSync = require('../../');
    const { bs, init, stop, system } = browserSync.create('test');

    init({serveStatic: ['fixtures']})
        .subscribe(([errors, output]) => {
            const address = '/system/core/server/sockets/clients';
            const sockets = system.actorSelection(address)[0];
            const actor = system.actorRegister.getValue()[address];
            actor.mailbox.outgoing.subscribe(x => {
                console.log(x);
            });
            sockets.tell('Reload').subscribe();

            // scheduler.flush();
            stop().subscribe(() => {
                done();
            });
        });
    scheduler.flush();
});