const {BrowsersyncProxy, createFromString, createItemFromString} = require('../../dist/plugins/proxy');
const {DefaultOptions} = require('../../dist/options');
const {createSystem, fromOptions} = require('../../dist');
const {fromJS, Map} = require('immutable');
const assert = require('assert');
const {init, Methods} = require('../../');

const {createWithOptions} = require('../../dist/Browsersync.init');


it.only('proxy', function (done) {

  const {bs, system} = init();
  const withOptions = fromOptions({proxy: 'http://example.com'})
    .flatMap(opts => {
      return createWithOptions(system, opts);
    })
    .subscribe((output) => {
      console.log('ype', output[1].toJS().rewriteRules);
      done();
    }, err => done(err))
  // bs.ask(Methods.Init)
  //   .subscribe(({errors, output}) => {
  //     if (errors.length) {
  //       done(errors[0]);
  //     } else {
  //       bs.ask(Methods.Stop)
  //         .subscribe(() => {
  //           console.log('All DONE');
  //           done();
  //         });
  //     }
  //   }, err => console.error('error', e));
});
