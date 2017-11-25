import {Observable} from 'rxjs';
import {MessageResponse} from "aktor-js";
import {List} from "immutable";
import {GetActorFn} from "../../Browsersync.init";
import {
    optionsHandler,
    ProxyOptionsInput
} from "./Options.message";
import {middlewareHandler, ProxyMiddleware} from "./Middleware.message";

export enum ProxyMessages {
    Options = 'options',
    Middleware = 'middleware'
}

export function BrowsersyncProxyFactory(): any {
    return {
        methods: {
            [ProxyMessages.Options]: optionsHandler,
            [ProxyMessages.Middleware]: middlewareHandler,
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
