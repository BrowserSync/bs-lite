const {BrowsersyncProxy, createFromString, createItemFromString} = require('../../dist/plugins/proxy');
const {DefaultOptions} = require('../../dist/options');
const {createSystem, fromOptions} = require('../../dist');
const {fromJS, Map} = require('immutable');
const assert = require('assert');


it.only('proxy', function (done) {
    const result = createItemFromString('http://localhost:3000?232');
    assert.equal(result.url.host, 'localhost:3000');
    assert.equal(result.target, 'http://localhost:3000');
    assert.equal(result.proxyReq.length, 0);
    done();
    // const system = createSystem();
    // const proxyActor = system.actorOf(BrowsersyncProxy);
    // const opts = fromOptions({
    //     proxy: 'http://www.example.com'
    // })
    //     .flatMap(merged => proxyActor.ask('opts', merged))
    //     .subscribe(({mw}) => {
    //         assert.equal(mw.length, 1);
    //         console.log(mw);
    //         done();
    //     });
});
