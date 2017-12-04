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
        .map(({respond, payload, state}) => {
            const firstProxy = state.app.stack.findIndex(x => x.type === MiddlewareTypes.proxy) || state.app.length;
            const nextStack = state.app.stack.slice();
            nextStack.splice(firstProxy, 0, ...payload.middleware);
            state.app.stack = nextStack;
            return respond([null, true], state);
        });
}
