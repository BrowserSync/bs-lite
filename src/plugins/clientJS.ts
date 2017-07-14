import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {BSCommonOptions} from "../index";
import {Middleware} from "./server";

type ClientJSIncomingType = string|string[]|Processed;

interface ClientJSIncoming {
    input: ClientJSIncomingType;
    options: BSCommonOptions;
}

interface Processed {
    input: ClientJSIncomingType;
    content: string
    id: string
}

function processIncoming(input: ClientJSIncomingType, options?: BSCommonOptions): Processed[] {
    return [].concat(input)
        .filter(Boolean)
        .map((input, index) : Processed => {
            if (typeof input === 'string') {
                return {
                    input,
                    id: `ClientJS (${index})`,
                    content: `
;/**
 * ClientJS (${index})
 */
${input}
/**
 * ---- ClientJS END (${index}) -----
 */;
 
                    `
                }
            }
            return input;
        })
}

function createMiddleware(incoming: ClientJSIncoming): Middleware[] {
    return processIncoming(incoming.input)
        .map((processed: Processed, index): Middleware => {
            return {
                id: processed.id,
                route: '/bs.js',
                handle: (req, res) => {
                    res.setHeader('Content-Type', 'application/javascript');
                    res.end(processed.content);
                }
            }
        })
}

export default function ClientJS(address: string, context: IActorContext) {

    return {
        methods: {
            init: function (stream) {
                return stream.flatMap(({action, respond}) => {
                    const mw = createMiddleware(action.payload);
                    return Observable.of(respond({mw}));
                })
            }
        },
        patterns: ['reduxObservable']
    }
}