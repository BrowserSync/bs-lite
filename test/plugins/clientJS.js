const {ClientJS} = require('../../dist/plugins/clientJS');
const {DefaultOptions} = require('../../dist/options');
const {createSystem} = require('../../dist');
const {fromJS, Map} = require('immutable');

it('converts incoming options into a payload', function (done) {
    const system = createSystem();
    const clientJSActor = system.actorOf(ClientJS);
    const opts = system.actorOf(DefaultOptions)
        .ask('merge', {
            clientJS: [
                'console.log("kittens 1")',
                () => 'console.log("kittens 2")',
                'file:./fixtures/test.js'
            ]
        })
        .flatMap(merged => clientJSActor.ask('init', merged))
        .subscribe(({mw}) => {
            mw[0].handle({}, {
                setHeader: () => {},
                end: (output) => {
                    console.log(output);
                    done();
                }
            })
        });
});
