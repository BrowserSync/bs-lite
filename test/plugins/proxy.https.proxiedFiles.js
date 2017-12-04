require('source-map-support').install();
const {readFileSync} = require('fs');
const serveStatic = require('serve-static');
const {getHttpsApp} = require("../utils");
const assert = require('assert');
const serverAssert = require("../utils").serverAssert;
const {TestScheduler, next} = require('@kwonoj/rxjs-testscheduler-compat');
const dirsJson = require('../../fixtures/stubs/dirs.json');
const inputPath = '/content/themes/wearejh/assets/dist/core.min.css';
const inputcss = `fixtures/wearejh.com${inputPath}`;

it.only('can track proxied files', function (done) {

    const {app, server, url} = getHttpsApp();
    const expected = readFileSync(inputcss, 'utf8');
    const scheduler = new TestScheduler();

    app.use(serveStatic('fixtures/wearejh.com'));

    const asserts = (resp, options) => {
        assert.equal(resp.text, expected);
    };

    serverAssert({
        proxy: [url],
    }, inputPath, asserts, {
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
        }})
        .do(() => server.close())
        .subscribe(() => done(), err => done(err));
});