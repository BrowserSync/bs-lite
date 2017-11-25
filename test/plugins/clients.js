require('source-map-support').install();
const {Observable} = require('rxjs');
const {ClientsFactory, ClientMessages} = require("../../dist/plugins/Sockets/Clients/Clients");
const assert = require('assert');
const uuid = require('uuid/v4');
const {TestScheduler, next} = require('@kwonoj/rxjs-testscheduler-compat');
const {async} = require('rxjs/scheduler');
const {BSErrorType, BSErrorLevel, printErrors} = require('../../');

it('Allows a time scheduler', function () {

    const scheduler = new TestScheduler();

    function reload(payload, id) {
        return {
            message: {
                address: '/system/core/server/sockets/clients',
                action: { type: 'Reload', payload }
            },
            messageID: id || uuid()
        }
    }

    const vals = [];

    const c = ClientsFactory('sockets', {
        timeScheduler: scheduler,
        parent: {
            tell: (name, payload) => {
                vals.push([name, payload]);
                return Observable.of(true);
            }
        }
    });

    const obs = scheduler.createColdObservable([
        next(100, reload('1', '01')),
        next(200, reload('2', '02')),
        next(3000, reload('2', '03')),
    ]);

    const out = scheduler.startScheduler(() => {
        return c.setupReceive(obs);
    }, {created: 0, subscribed: 0, unsubscribed: 701});

    assert.equal(vals.length, 1);

});
