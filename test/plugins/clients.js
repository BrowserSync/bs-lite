require('source-map-support').install();
const assert = require('assert');
const {TestScheduler} = require('@kwonoj/rxjs-testscheduler-compat');
const {async} = require('rxjs/scheduler');
const {BSErrorType, BSErrorLevel, printErrors} = require('../../');

it.only('Gives errors about strict mode when no matching port is found', function (done) {

    const scheduler = new TestScheduler();
    const browserSync = require('../../');
    const { bs, init, stop, system } = browserSync.create('test', {timeScheduler: scheduler});

    const i = setInterval(() => scheduler.flush(), 100);

    init({serveStatic: ['fixtures']})
        .subscribe(async ([errors, output]) => {

            const address = '/system/core/server/sockets/clients';
            const sockets = system.actorSelection(address)[0];

            const actor = system.actorRegister.getValue()[address];

            actor.mailbox.outgoing.subscribe(x => {
                console.log(x, 'm');
            });

            await sockets.tell('Reload', 'yo').toPromise();
            await stop().toPromise();
            done();
        });
});