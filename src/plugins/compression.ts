import {Middleware} from "./server";

export default function Compression() {
    return {
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