import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {BSCommonOptions} from "../index";
import {Middleware} from "./server";
import {IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";

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
                    id: `Browsersync ClientJS (${index})`,
                    content: `;
/**
 * Browsersync ClientJS (${index})
 */
${input}
/**
 * ---- ClientJS END (${index}) -----
 */
;
`
                }
            }
            return input;
        })
}

function createMiddleware(incoming: ClientJSIncoming): Middleware[] {

    const coreJS = [
        {
            id: 'bs-no-conflict',
            content: 'window.___browserSync___oldSocketIo = window.io;',
        },
    ];

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
            init: function (stream: IRespondableStream) {
                return stream.flatMap(({payload, respond}) => {
                    const mw = createMiddleware(payload);
                    return Observable.of(respond({mw}));
                })
            }
        }
    }
}