import {Middleware} from "./server";
export default function Compression() {
    return {
        receive(payload, message, sender) {
            try {
                const mw : Middleware = {
                    id: 'Compression',
                    route: '',
                    handle: require('compression')()
                };
                const output = {
                    mw: [mw]
                };
                sender.reply(output);
            } catch (e) {
                console.log(e);
            }
        }
    }
}