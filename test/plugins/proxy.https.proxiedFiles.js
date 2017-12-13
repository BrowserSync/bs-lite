require('source-map-support').install();
const {Observable} = require('rxjs');
const serveStatic = require('serve-static');
const {getHttpsApp} = require("../utils");
const assert = require('assert');
const {TestScheduler} = require('@kwonoj/rxjs-testscheduler-compat');
const dirsJson = require('../../fixtures/stubs/dirs.json');
const inputPath = '/content/themes/wearejh/assets/dist/core.min.css';
const inputPath2 = '/content/themes/wearejh/assets/dist/core2.min.css';
const request = require('supertest-as-promised');
const {ServeStaticMiddleware} = require('../../dist/plugins/ServeStatic/serveStatic.js');

function dirsStub (address, context) {
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
}

describe('proxied files', function () {

    it('can track proxied files by serving an entire directory', function (done) {

        const {create} = require('../../');
        const {app, url} = getHttpsApp();
        const cwd = '/user/badger';
        app.use(serveStatic('fixtures/wearejh.com'));

        const {init, stop, system} = create('test', {
            // timeScheduler: scheduler,
            dirs: dirsStub,
            exists: function() {
                return {
                    receive(name, payload, respond) {
                        switch (name) {
                            case 'Exists': return respond(true);
                            case 'stop': return respond('ok');
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
        const {app, url} = getHttpsApp();
        const cwd = '/users/badger';
        app.use(serveStatic('fixtures/wearejh.com'));

        const {init, stop, system} = create('test', {
            dirs: dirsStub,
            exists: function() {
                return {
                    receive(name, payload, respond) {
                        switch (name) {
                            case 'Exists': {
                                if (payload.endsWith('/fixtures/wearejh.com/content/themes/wearejh/assets/dist/core.min.css')) {
                                    return respond(true);
                                }
                                return respond(false);
                            }
                            case 'stop': return respond('ok');
                        }
                    }
                }
            }
        });

        const a = system.actorRegister.getValue();

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
                    .flatMap(() => stop())
                    .subscribe(() => {
                        done();
                    }, err => done(err));
            })
    });

    it('can track proxied files in root', function (done) {

        const {create} = require('../../');
        const {app, url} = getHttpsApp();
        const cwd = '/user/badger';
        app.use(serveStatic('.'));

        const {init, stop, system} = create('test', {
            dirs: dirsStub,
            exists: function() {
                return {
                    receive(name, payload, respond) {
                        switch (name) {
                            case 'Exists': return respond(true);
                            case 'stop': return respond('ok');
                        }
                    }
                }
            }
        });

        const a = system.actorRegister.getValue();

        init({
            proxy: [url],
            cwd,
        })
            .subscribe(([errors, output]) => {

                if (errors && errors.length) {
                    return done(errors[0].errors[0]);
                }

                Observable.zip(
                    a['/system/core/serveStatic'].mailbox.incoming,
                    a['/system/core/dirs'].mailbox.incoming,
                    a['/system/core/exists'].mailbox.incoming,
                    a['/system/core/servedFiles'].mailbox.incoming.skip(1), // skip init
                    Observable.fromPromise(request(output.server).get('/example.js').set('accept', 'text/javascript'))
                )
                    .take(1)
                    .do(([ss, dirs, exists, served]) => {

                        // ServeStatic Message
                        {
                            const [type, payload] = ServeStaticMiddleware.create(cwd, {
                                "dir": "/user/badger/",
                                "route": "/"
                            });
                            assert.equal(ss.message.action.type, type);
                            assert.deepEqual(ss.message.action.payload, payload);
                        }

                        // Dirs message
                        {
                            const {DirsGet} = require('../../dist/plugins/dirs');
                            const [type, payload] = DirsGet.create(cwd, cwd);
                            assert.equal(dirs.message.action.type, type);
                            assert.deepEqual(dirs.message.action.payload, payload);
                        }

                        // Exists Message
                        {
                            const {Exists} = require('../../dist/Fs/Exists');
                            const [type, payload] = Exists.create(`${cwd}/example.js`);
                            assert.equal(exists.message.action.type, type);
                            assert.deepEqual(exists.message.action.payload, payload);
                        }

                        {
                            const {ServedFilesAdd} = require('../../dist/plugins/ServedFiles/ServedFiles');
                            const [type, payload] = ServedFilesAdd.create(cwd, `${cwd}/example.js`);
                            assert.equal(served.message.action.type, type);
                            assert.deepEqual(served.message.action.payload, payload);
                        }
                    })
                    .flatMap(() => stop())
                    .subscribe(() => {
                        done();
                    }, err => {
                        stop().subscribe(x => {
                            done(err);
                        })
                    })
            });
    });
});
