require('source-map-support').install();
const {readFileSync} = require('fs');
const {join} = require('path');
const serveStatic = require('serve-static');
const {getHttpsApp} = require("../utils");
const assert = require('assert');
const serverAssert = require("../utils").serverAssert;
const {TestScheduler, next} = require('@kwonoj/rxjs-testscheduler-compat');
const dirsJson = require('../../fixtures/stubs/dirs.json');
const inputPath = '/content/themes/wearejh/assets/dist/core.min.css';
const inputPath2 = '/content/themes/wearejh/assets/dist/core2.min.css';
const inputcss = `fixtures/wearejh.com${inputPath}`;
const inputcss2 = `fixtures/wearejh.com${inputPath2}`;
const request = require('supertest-as-promised');

it('can track proxied files in sub-directories', function (done) {

    const {create} = require('../../');
    const {app, server, url} = getHttpsApp();
    const expected = join(process.cwd(), 'fixtures/wearejh.com/content/themes/wearejh/assets/dist');
    app.use(serveStatic('fixtures/wearejh.com'));

    const scheduler = new TestScheduler();
    const {init, stop, system} = create('test', {
        timeScheduler: scheduler,
        dirs: function(address, context) {
            return {
                receive(name, payload, respond) {
                    switch(name) {
                        case 'Get': return respond([null, dirsJson]);
                        case 'stop': return respond([null, 'ok']);
                    }
                }
            }
        }
    });

    const a = system.actorRegister.getValue();
    const messages = [];

    a['/system/core/serveStatic'].mailbox.incoming
        .skip(1)
        .take(1)
        .do(x => {
            messages.push(x);
        })
        .subscribe();

    init({proxy: [url]})
        .subscribe(async ([errors, output]) => {

            if (errors && errors.length) {
                return done(errors[0].errors[0]);
            }

            await request(output.server).get(inputPath).set('accept', 'text/css');
            await request(output.server).get(inputPath2).set('accept', 'text/css');

            scheduler.flush();

            stop().subscribe(() => {
                const msg = messages[0].message.action.payload;
                assert.equal(msg.options.route, '/content/themes/wearejh/assets/dist');
                assert.equal(msg.options.dir, expected);
                done();
            });
        })
});

it('can track proxied files in root', function (done) {

    const {create} = require('../../');
    const {app, server, url} = getHttpsApp();
    const cwd = process.cwd();
    app.use(serveStatic('.'));

    const scheduler = new TestScheduler();
    const {init, stop, system} = create('test', {
        timeScheduler: scheduler,
        dirs: function(address, context) {
            return {
                receive(name, payload, respond) {
                    switch(name) {
                        case 'Get': return respond([null, dirsJson]);
                        case 'stop': return respond([null, 'ok']);
                    }
                }
            }
        }
    });

    const a = system.actorRegister.getValue();
    const messages = [];

    a['/system/core/serveStatic'].mailbox.incoming
        .skip(1)
        .take(1)
        .do(x => {
            messages.push(x);
        })
        .subscribe();

    init({proxy: [url]})
        .subscribe(async ([errors, output]) => {

            if (errors && errors.length) {
                return done(errors[0].errors[0]);
            }

            await request(output.server).get('/example.js').set('accept', 'text/javascript');

            scheduler.flush();

            stop().subscribe(() => {
                // console.log(messages[0].message.action);
                const msg = messages[0].message.action.payload;
                // console.log(msg);
                assert.equal(msg.options.route, '/');
                assert.equal(msg.options.dir, cwd + '/');
                done();
            });
        })
});
