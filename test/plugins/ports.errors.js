require('source-map-support').install();
const assert = require('assert');
const {BSErrorType, BSErrorLevel, printErrors} = require('../../');

it('Gives errors about strict mode when no matching port is found', function (done) {
    const browserSync = require('../../');

    const {bs, init, stop} = browserSync.create('test');

    const p = bs.system.actorOf(function(address, context) {
        return {
            receive(name, payload, respond) {
                respond([null, 3001]);
            }
        }
    }, 'findPort');

    init({proxy: 'http://example.com', port: 3000})
        .subscribe(([errors, output]) => {
            const first = errors[0];
            const type = first.type;
            const level = first.level;
            assert.equal(type, BSErrorType.PortNotAvailable);
            assert.equal(level, BSErrorLevel.Fatal);
            stop()
                .subscribe(() => {
                    done();
                })
        });
});

it('Gives generic errors when port cannot be detected', function (done) {
    const browserSync = require('../../');

    const {bs, init, stop} = browserSync.create('test');

    const p = bs.system.actorOf(function(address, context) {
        return {
            receive(name, payload, respond) {
                respond([new Error('oops!')]);
            }
        }
    }, 'findPort');

    init({proxy: 'http://example.com'})
        .subscribe(([errors, output]) => {
            const first = errors[0];
            const type = first.type;
            const level = first.level;
            assert.equal(type, BSErrorType.PortDetectError);
            assert.equal(level, BSErrorLevel.Fatal);

            stop()
                .subscribe(() => {
                    done();
                })
        });
});
