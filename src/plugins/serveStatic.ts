import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {BSCommonOptions} from "../index";
import {join, parse, ParsedPath} from "path";
import {Middleware, MiddlewareResponse} from "./server";
import {IRespondableStream} from "aktor-js/dist/patterns/redux-observable";

type SSIncomingType = string|string[];

interface SSIncoming {
    input: SSIncomingType
    options: BSCommonOptions
}

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
function processIncoming(input: string|string[], options: BSCommonOptions): Processed[] {
    return [].concat(input)
        .map((input) : Processed => {
            return {
                input,
                parsed: parse(input),
                resolved: join(options.cwd, input)
            }
        })
}

function createMiddleware(incoming: SSIncoming): Middleware[] {
    return processIncoming(incoming.input, incoming.options)
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
        methods: {
            init: function (stream: IRespondableStream): Observable<MiddlewareResponse> {
                return stream.flatMap(({payload, respond}) => {
                    const mw = createMiddleware(payload);
                    return Observable.of(respond({mw}));
                })
            }
        },
        patterns: ['reduxObservable']
    }
}
