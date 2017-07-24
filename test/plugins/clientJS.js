const {ClientJS} = require('../../dist/plugins/clientJS');
const {DefaultOptions} = require('../../dist/options');
const {createSystem} = require('../../dist');
const {fromJS, Map} = require('immutable');

it('converts incoming options into a payload', function (done) {
    const system = createSystem();
    const client = system.actorOf(ClientJS);
    const opts = system.actorOf(DefaultOptions)
        .ask('merge', {
            clientJS: ['console.log("kittenez")']
        })
        .flatMap(merged => client.ask('init', merged))
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
