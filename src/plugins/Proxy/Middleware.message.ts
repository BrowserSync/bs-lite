import {Observable} from 'rxjs';
import httpProxy = require('http-proxy');
import {checkCookies} from "./proxy-utils";
import {createItemFromObject, createItemFromString, ProxyItem, ProxyOptionsInput} from "./Options.message";
import {Middleware, MiddlewareTypes} from "../Server/Server";
import {IActorContext, IMethodStream, MessageResponse} from "aktor-js";
import {ProxyChild, ProxyChildMessages} from "./ProxyChild/ProxyChild";
import {gracefullyStopChildren} from "../../utils";
import {ProxyMessages} from "./Proxy";

export namespace ProxyMiddleware {
    export type Input = ProxyOptionsInput[];
    export type Response = [null|Error[], null|Middleware[]];
    export function create(input: Input): [ProxyMessages.Middleware, Input] {
        return [ProxyMessages.Middleware, input];
    }
}

export function getMiddlewareHandler(context: IActorContext): any {
    return function middlewareHandler(stream: IMethodStream<ProxyMiddleware.Input, ProxyMiddleware.Response, any>): any {
        return stream.flatMap(({payload, respond}) => {
            return gracefullyStopChildren(context)
                .flatMap(() => {
                    return Observable.from([].concat(payload).filter(Boolean))
                        .map(input => {
                            if (typeof input === "string") {
                                return createItemFromString(input)
                            }
                            return createItemFromObject(input);
                        })
                        .flatMap((item: ProxyItem) => context.actorOf(ProxyChild).ask(ProxyChildMessages.Start, item))
                        .reduce((acc: any[], [err, item]) => acc.concat(item), [])
                        .map((mws: Middleware[]) => respond([null, mws]))
                })
        })
    }
}
