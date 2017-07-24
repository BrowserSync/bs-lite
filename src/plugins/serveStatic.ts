import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Options} from "../index";
import {join, parse, ParsedPath} from "path";
import {Middleware, MiddlewareResponse} from "./server";
import {IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";
const debug = require('debug')('bs:serveStatic');

type SSIncomingType = string|string[]|Processed|Processed[];

interface Processed {
    input: SSIncomingType,
    parsed: ParsedPath,
    resolved: string
}

/**
 * Serve static options:
 *
 *  eg: serveStatic: ['src']
 *  eg: serveStatic: 'app'
 */
function processIncoming(input: string|string[], options: Options): Processed[] {
    return [].concat(input)
        .map((input) : Processed => {
            return {
                input,
                parsed: parse(input),
                resolved: join(options.get('cwd'), input)
            }
        })
}

function createMiddleware(options: Options): Middleware[] {
    const optionItems = options.get('serveStatic').toJS();
    return processIncoming(optionItems, options)
        .map((item: Processed, index): Middleware => {
            return {
                id: `Serve Static (${index})`,
                route: '',
                handle: require('serve-static')(item.resolved)
            }
        });
}

export default function(address: string, context: IActorContext) {


    return {
        postStart() {
            debug('-> postStart()');
        },
        methods: {
            init: function (stream: IRespondableStream): Observable<MiddlewareResponse> {
                return stream.flatMap(({payload, respond}) => {
                    const mw = createMiddleware(payload);
                    return Observable.of(respond({mw}));
                })
            }
        },
    }
}
