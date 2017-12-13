require('source-map-support').install();
const {Observable} = require('rxjs');
const {readFileSync} = require('fs');
const {join} = require('path');
const {async} = require('rxjs/scheduler/async');
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


describe('proxied files', function () {

    it('can track proxied files by serving an entire directory', function (done) {

        const {create} = require('../../');
        const {app, server, url} = getHttpsApp();
        const cwd = '/user/badger';
        app.use(serveStatic('fixtures/wearejh.com'));

        const {init, stop, system} = create('test', {
            // timeScheduler: scheduler,
            dirs: function (address, context) {
                return {
                    receive(name, payload, respond) {
                        switch (name) {
                            case 'Get':
                                return respond([null, dirsJson]);
                            case 'stop':
                                return respond([null, 'ok']);
                        }
                    }
                }
            },
            exists: function() {
                return {
                    receive(name, payload, respond) {
                        switch (name) {
                            case 'ExistsSync': {
                                return respond(true);
                            }
                            case 'stop':
                                return respond('ok');
                        }
                    }
                }
            }
        });

        const a = system.actorRegister.getValue();

        init({
            proxy: [{
                target: url,
                proxiedFileOptions: {
                    matchFile: false
                }
            }],
            cwd,
        })
            .subscribe(([errors, output]) => {

                if (errors && errors.length) {
                    return done(errors[0].errors[0]);
                }

                Observable.zip(
                    a['/system/core/serveStatic'].mailbox.incoming.take(1),
                    Observable.merge(
                        request(output.server).get(inputPath).set('accept', 'text/css'),
                        request(output.server).get(inputPath2).set('accept', 'text/css')
                    ).toArray()
                )
                    .do(([ss]) => {
                        const msg = ss.message.action.payload;
                        assert.equal(msg.options.route, '/content/themes/wearejh/assets/dist');
                        assert.equal(msg.options.dir, `${cwd}/content/themes/wearejh/assets/dist`);
                    })
                    .subscribe(() => {
                        stop().subscribe(() => {
                            done();
                        })
                    }, e => done(e));
            })
    });

    it('can track a single proxied file by creating a direct mapping', function (done) {

        const {create} = require('../../');
        const {app, server, url} = getHttpsApp();
        const cwd = '/users/badger';
        const expectedRoute = '/content/themes/wearejh/assets/dist/core.min.css';
        const expectedDir = `${cwd}/fixtures/wearejh.com/content/themes/wearejh/assets/dist/core.min.css`;
        app.use(serveStatic('fixtures/wearejh.com'));

        const scheduler = new TestScheduler();
        const {init, stop, system} = create('test', {
            dirs: function (address, context) {
                return {
                    receive(name, payload, respond) {
                        switch (name) {
                            case 'Get': {
                                return respond([null, dirsJson]);
                            }
                            case 'stop':
                                return respond([null, 'ok']);
                        }
                    }
                }
            },
            exists: function() {
                return {
                    receive(name, payload, respond) {
                        switch (name) {
                            case 'ExistsSync': {
                                if (payload.endsWith('/fixtures/wearejh.com/content/themes/wearejh/assets/dist/core.min.css')) {
                                    return respond(true);
                                }
                                return respond(false);
                            }
                            case 'stop':
                                return respond('ok');
                        }
                    }
                }
            }
        });

        const a = system.actorRegister.getValue();
        const messages = [];
        const dirs = [];

        init({
            proxy: [{
                target: url, proxiedFileOptions: {
                    matchFile: true,
                    baseDirectory: 'fixtures'
                }
            }],
            cwd,
        })
            .subscribe(([errors, output]) => {

                if (errors && errors.length) {
                    return done(errors[0].errors[0]);
                }

                Observable.zip(
                    a['/system/core/serveStatic'].mailbox.incoming,
                    a['/system/core/dirs'].mailbox.incoming,
                    Observable.merge(
                        request(output.server).get(inputPath).set('accept', 'text/css'),
                        request(output.server).get(inputPath2).set('accept', 'text/css')
                    ).toArray()
                )
                    .take(1)
                    .subscribe((xs) => {
                        done();
                    }, err => done(err));
            })
    });

    it.only('can track proxied files in root', function (done) {

        const {create} = require('../../');
        const {app, server, url} = getHttpsApp();
        const cwd = '/user/badger';
        app.use(serveStatic('.'));

        const scheduler = new TestScheduler();
        const {init, stop, system} = create('test', {
            timeScheduler: scheduler,
            dirs: function (address, context) {
                return {
                    receive(name, payload, respond) {
                        switch (name) {
                            case 'Get':
                                return respond([null, dirsJson]);
                            case 'stop':
                                return respond([null, 'ok']);
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

        init({
            proxy: [url],
            cwd,
        })
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
})
