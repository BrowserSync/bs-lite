require('source-map-support').install();
const assert = require('assert');
const {BSErrorType, BSErrorLevel, printErrors} = require('../../');

it.only('Gives errors about strict mode when no matching port is found', function (done) {
    const browserSync = require('../../');

    const {bs, init, stop, system} = browserSync.create('test', {
        'findPort': function Find() {
            return {
                receive(name, payload, respond) {
                    respond([null, 3001]);
                }
            }
        }
    });

    init({serveStatic: ['fixtures']})
        .subscribe(([errors, output]) => {
            const address = '/system/core/server/sockets/clients';
            const sockets = system.actorSelection('/system/core/server/sockets/clients')[0];
            const actor = system.actorRegister.getValue()[address];
            actor.mailbox.outgoing.subscribe(x => {
                console.log(x);
            });
            sockets.tell('Reload').subscribe();
            stop().subscribe(() => {
                done();
            });
        });
});