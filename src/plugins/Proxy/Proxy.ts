import {Observable} from 'rxjs';
import {IActorContext, MessageResponse} from "aktor-js";
import {List} from "immutable";
import {GetActorFn} from "../../Browsersync.init";
import {
    optionsHandler,
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

export function askForProxyMiddleware (getActor: GetActorFn, proxyOption: ProxyOptionsInput[]): any {
    if (proxyOption.length) {
        return getActor('proxy', BrowsersyncProxyFactory)
            .ask(ProxyMessages.Middleware, proxyOption)
    }
    return Observable.of([null, []]);
}

export function askForProxyOptions(getActor: GetActorFn, proxyOption: ProxyOptionsInput[]): any {
    if (proxyOption.length) {
        return getActor('proxy', BrowsersyncProxyFactory)
            .ask(ProxyMessages.Options, proxyOption)
    }
    return Observable.empty();
}
