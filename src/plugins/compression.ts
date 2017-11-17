import {Middleware, MiddlewareTypes} from "./Server/Server";
const debug = require('debug')('bs:compression');

export default function Compression() {
    return {
        postStart() {
            debug('-> postStart()');
        },
        receive(name, payload, respond) {
            if (name === 'middleware') {
                try {
                    const mw : Middleware = {
                        id: 'Compression',
                        route: '',
                        type: MiddlewareTypes.other,
                        handle: require('compression')()
                    };
                    respond(mw);
                } catch (e) {
                    console.log(e);
                }
            } else {
                respond(':)');
            }
        }
    }
}
