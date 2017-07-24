import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Middleware} from "./server";
import {IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";
import {socketConnector} from "../connect-utils";
import {Options} from "../index";
import {readFileSync} from "fs";
import {client} from "../config";
const debug = require('debug')('bs:clientJS');

export type ClientJSIncomingType = string|string[]|Processed|Processed[];

export interface ClientJSIncoming {
    options: Options;
}

export interface Processed {
    input?: ClientJSIncomingType;
    content: (options: Options, item?: Processed) => string;
    id: string
    via?: string
}

function createOne(ref: string, content: string, via: string): string  {
    return `/**
 * Browsersync ClientJS (${ref})
 * VIA: ${via}
 */
${content}
/**
 * ---- ClientJS END (${ref}) -----
 */`
}

export function processIncomingOptions(input: ClientJSIncomingType): Processed[] {
    return [].concat(input)
        .filter(Boolean)
        .map((input, index) : Processed => {
            if (typeof input === 'string') {
                return {
                    id: `bs-user-client-js-${index}`,
                    via: 'User Options',
                    content: () => input,
                    input,
                }
            }
            return {
                id: `bs-user-client-js-${index}`,
                via: 'User Options',
                content: () => input,
                input,
                ...input
            }
        })
}

function createMiddleware(options: Options): Middleware[] {

    const coreJS = [
        {
            id: 'bs-no-conflict',
            content: () => 'window.___browserSync___oldSocketIo = window.io;',
            via: 'Browsersync Core'
        },
        {
            id: 'bs-socket-connector',
            content: (options, item) => socketConnector(options),
            via: 'Browsersync Core'
        },
        {
            id: 'browser-sync-client',
            content: (options, item) => readFileSync(client.main, 'utf8'),
            via: 'Browsersync Core'
        },
    ];

    const joined = (function() {            
        if (options.getIn(['socket', 'enabled'])) {
            return coreJS;
        }
        return [];
    })();

    // console.log(incoming.options.get('clientJS'));
    // const joined = coreJS.concat(incoming.input);
    // const js = processIncoming(joined);
    const userjs = processIncomingOptions(options.get('clientJS').toJS());

    return [{
        id: 'Browsersync ClientJS',
        route: '/bs.js',
        handle: (req, res) => {
            res.setHeader('Content-Type', 'application/javascript');
            const output = [...joined, ...userjs]
                .map((item: Processed) => {
                    return createOne(item.id, item.content(options, item), item.via)
                });
            res.end(output.join('\n\n'));
        }
    }]
}

export function ClientJS(address: string, context: IActorContext) {

    return {
        postStart() {
            debug('-> postStart()');
        },
        methods: {
            init: function (stream: IRespondableStream) {
                return stream.flatMap(({payload, respond}) => {
                    const mw = createMiddleware(payload);
                    return Observable.of(respond({mw}));
                });
            }
        }
    }
}
export default ClientJS;
