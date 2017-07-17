import {Middleware} from "./server";
const debug = require('debug')('bs:compression');

export default function Compression() {
    return {
        postStart() {
            debug('-> postStart()');
        },
        receive(name, payload, respond) {
            try {
                const mw : Middleware = {
                    id: 'Compression',
                    route: '',
                    handle: require('compression')()
                };
                const output = {
                    mw: [mw]
                };
                respond(output);
            } catch (e) {
                console.log(e);
            }
        }
    }
}