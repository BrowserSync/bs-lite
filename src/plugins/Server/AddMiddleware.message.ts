import {Observable} from 'rxjs';
import {Middleware, MiddlewareTypes, ServerMessages, ServerState} from "./Server";
import {IActorContext, IMethodStream, MessageResponse} from "aktor-js";
const debug = require('debug')('bs:Server:AddMiddleware');

export namespace ServerAddMiddleware {
    export type Response = [null|Error[], boolean]
    export type Input = {
        middleware: Middleware[]
    }
    export function create(mw: Middleware[]): [ServerMessages.AddMiddleware, ServerAddMiddleware.Input] {
        return [ServerMessages.AddMiddleware, {middleware: mw}];
    }
}

export function addMiddlewareHandler(stream: IMethodStream<ServerAddMiddleware.Input, ServerAddMiddleware.Response, ServerState>): any {
    return stream
        .do(({payload}) => debug(payload))
        .filter(({state}) => state.app && state.app.stack && state.app.stack.length)
        .map(({respond, payload, state}) => {

            const nextStack = state.app.stack.slice();

            const orders = [
                MiddlewareTypes.other,
                MiddlewareTypes.clientJs,
                MiddlewareTypes.rewriteRules,
                MiddlewareTypes.serveStatic,
                MiddlewareTypes.proxy,
            ];

            // const items
            const newOrderedStack = orders.reduce((acc, type) => {
                const matchingItems = nextStack.filter(mw => mw.type === type);
                const matchingIncoming = payload.middleware.filter(x => x.type === type);
                if (matchingIncoming.length) {
                    return acc.concat(matchingItems, matchingIncoming);
                }
                return acc.concat(matchingItems);
            }, []);

            // side effecting code. This replaces the middleware stack
            state.app.stack = newOrderedStack;

            return respond([null, true], state);
        });
}
