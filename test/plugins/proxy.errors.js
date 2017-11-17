require('source-map-support').install();
const {BrowsersyncProxy, createFromString, createItemFromString} = require('../../dist/plugins/proxy');
const {DefaultOptions} = require('../../dist/options');
const {createSystem, fromOptions} = require('../../dist');
const {fromJS, Map} = require('immutable');
const assert = require('assert');
const http = require("http");
const connect = require("connect");
const serverAssert = require("../utils").serverAssert;
const {init, Methods} = require('../../');
const {createWithOptions} = require('../../dist/Browsersync.init');
const {BSErrorTypes} = require('../../dist/errors');

it('handles incorrect input type (setup error)', function (done) {
    const browserSync = require('../../');

    const {bs, init, stop} = browserSync.create();

    init({proxy: 1})
        .subscribe(([errors, output]) => {
            const first = errors[0];
            const type = first.type;
            assert.equal(type, BSErrorTypes.ProxyInvalidInput);
            // console.log('   Error Type:', first.type);
            // console.log('Error Message:', first.errors[0].error.message);
            // console.log('   Your Input:', first.errors[0].meta.input);
            // console.log('     Examples:', first.errors[0].meta.examples.join(', '));
            done();
        });
});
