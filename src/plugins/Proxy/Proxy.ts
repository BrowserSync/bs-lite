import {Observable} from 'rxjs';
import {IActorContext, MessageResponse} from "aktor-js";
import {List} from "immutable";
import {GetActorFn} from "../../Browsersync.init";
import {
    optionsHandler, ProxyOptions,
    ProxyOptionsInput
} from "./Options.message";
import {getMiddlewareHandler, ProxyMiddleware} from "./Middleware.message";
import {gracefullyStopChildren} from "../../utils";

export enum ProxyMessages {
    Options = 'options',
    Middleware = 'middleware',
    Stop = 'stop',
}

export function BrowsersyncProxyFactory(address, context: IActorContext): any {
    return {
        methods: {
            [ProxyMessages.Options]: optionsHandler,
            [ProxyMessages.Middleware]: getMiddlewareHandler(context),
            [ProxyMessages.Stop]: function(stream) {
                return stream.flatMap(({respond}) => {
                    return gracefullyStopChildren(context)
                        .mapTo(respond([null, 'ok!']))
                })
            },
        }
    }
}

export function getProxyOption(input: any): ProxyOptionsInput[] {
    return List([]).concat(input).toJS().filter(Boolean);
}

export function askForProxyMiddleware(getActor: GetActorFn, proxyOption: ProxyOptionsInput[]): any {
    if (proxyOption.length) {
        const message = ProxyMiddleware.create(proxyOption);
        return getActor('proxy', BrowsersyncProxyFactory)
            .ask(message[0], message[1])
    }
    return Observable.of([null, []]);
}

export function askForProxyOptions(getActor: GetActorFn, proxyOption: ProxyOptionsInput[]): any {
    if (proxyOption.length) {
        const message = ProxyOptions.create(proxyOption);
        return getActor('proxy', BrowsersyncProxyFactory)
            .ask(message[0], message[1])
    }
    return Observable.empty();
}
