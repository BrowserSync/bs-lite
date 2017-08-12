require('source-map-support').install();
const {BrowsersyncProxy, createFromString, createItemFromString} = require('../../dist/plugins/proxy');
const {DefaultOptions} = require('../../dist/options');
const {createSystem, fromOptions} = require('../../dist');
const {fromJS, Map} = require('immutable');
const assert = require('assert');
const {init, Methods} = require('../../');

const {createWithOptions} = require('../../dist/Browsersync.init');

it.skip('proxy', function (done) {
  // todo get proxy e2e tests up and running
});
