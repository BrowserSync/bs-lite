import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Middleware, MiddlewareTypes} from "./Server/server";
import {IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";
import {clientScript, socketConnector} from "../connect-utils";
import {Options} from "../index";
import {client} from "../config";
import {readFileSafe} from "../utils";
const debug = require('debug')('bs:clientJS');

export type ClientJSIncomingType = string|string[]|Processed|Processed[];

export interface Processed {
    input?: ClientJSIncomingType;
    content: (options: Options, item?: Processed, req?: any, res?: any) => string;
    id: string
    via: string
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

export function processIncomingOptions(input: ClientJSIncomingType, cwd: string): Processed[] {
    return [].concat(input)
        .filter(Boolean)
        .map((input, index) : Processed => {
            const id = `bs-user-client-js-${index}`;
            if (typeof input === 'string') {
                if (input.slice(0, 5) === 'file:') {
                    return {
                        id,
                        via: 'User Options [file:path]',
                        content: () => {
                            return readFileSafe(input.slice(5), cwd)
                        },
                        input,
                    }
                }
                return {
                    id,
                    via: 'User Options [string]',
                    content: () => input,
                    input,
                }
            }
            if (typeof input === 'function') {
                return {
                    id,
                    via: 'User Options [function]',
                    content: input,
                    input,
                }
            }
            return {
                id,
                via: 'User Options',
                content: () => input,
                input,
                ...input
            }
        })
}

function createMiddleware(options: Options): Middleware {

    const coreJS = [
        {
            id: 'bs-socket-connector',
            content: (options, item) => socketConnector(options),
            via: 'Browsersync Core'
        },
        {
            id: 'browser-sync-client',
            content: (options, item) => readFileSafe(client.mainDist, options.get('cwd')),
            via: 'Browsersync Core'
        },
    ];

    const joined = (function() {            
        if (options.getIn(['socket', 'enabled'])) {
            return coreJS;
        }
        return [];
    })();

    const userjs = processIncomingOptions(options.get('clientJS').toJS(), options.get('cwd'));

    return {
        id: 'Browsersync ClientJS',
        route: clientScript(options),
        type: MiddlewareTypes.clientJs,
        handle: (req, res) => {
            res.setHeader('Content-Type', 'application/javascript');
            const output = [...joined, ...userjs]
                .map((item: Processed) => {
                    return createOne(item.id, item.content(options, item, req, res), item.via)
                });
            const joinedOutput = output.join('\n\n');
            const headerList = [...joined, ...userjs].map(x => ` * ${x.id} (via: ${x.via})`).join(`\n`);
            const brandhead = ' * Browsersync ClientJS items:\n';
            const header = `/**\n` + brandhead + headerList + '\n */';
            res.end([header, joinedOutput].join('\n\n'));
        }
    }
}

export function ClientJS(address: string, context: IActorContext) {

    return {
        postStart() {
            debug('-> postStart()');
        },
        methods: {
            middleware: function (stream: IRespondableStream) {
                return stream.flatMap(({payload, respond}) => {
                    const mw = createMiddleware(payload);
                    return Observable.of(respond(mw));
                });
            }
        }
    }
}
export default ClientJS;
