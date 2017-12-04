require('source-map-support').install();
const {readFileSync} = require('fs');
const serveStatic = require('serve-static');
const {getHttpsApp} = require("../utils");
const assert = require('assert');
const serverAssert = require("../utils").serverAssert;
const {TestScheduler, next} = require('@kwonoj/rxjs-testscheduler-compat');

it.only('can track proxied files', function (done) {

    const {app, server, url} = getHttpsApp();
    const expected = readFileSync('fixtures/css/styles.css', 'utf8');
    const scheduler = new TestScheduler();

    app.use(serveStatic('fixtures'));

    const asserts = (resp, options) => {
        assert.equal(resp.text, expected, 'fixtures/css/styles.css');
    };

    serverAssert({
        proxy: [url],
    }, '/css/styles.css?rel=where', asserts, {timeScheduler: scheduler})
        .do(() => server.close())
        // .do(() => scheduler.flush())
        .subscribe(() => done(), err => done(err));
});