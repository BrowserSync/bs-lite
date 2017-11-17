import {Observable} from 'rxjs';
import {BrowserSyncState} from "../Browsersync";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {DefaultOptions, DefaultOptionsMethods} from "../options";
import {getOptionsAndMiddleware} from "../Browsersync.init";
import {ServerMessages} from "../plugins/Server/Server";
import * as http from "http";
import {Options} from "../index";
import {IActorContext} from "aktor-js/dist/ActorContext";
import {ServerInit} from "../plugins/Server/Init.message";

const {of} = Observable;

export namespace BrowsersyncInit {
    export type Output = {
        server: http.Server|null
        options: Options
    }
    export type Response = [null|Error[], null|Output];
    export type Input = object;
}

export function initMessageHandler(context: IActorContext) {
    return function (stream: IMethodStream<BrowsersyncInit.Input, BrowsersyncInit.Response, BrowserSyncState>) {
        return stream.switchMap(({payload, respond, state}) => {
            return context.actorOf(DefaultOptions)
                .ask(DefaultOptionsMethods.Merge, payload)
                .flatMap((mergedOptions) => {
                    const nextState = {
                        server: state.server,
                        options: mergedOptions,
                    };
                    return getOptionsAndMiddleware(context, mergedOptions)
                        .flatMap(({middleware, options}) => {
                            const payload = {middleware, options};
                            return state.server
                                .ask(ServerMessages.Init, payload)
                                .flatMap((resp: ServerInit.Response) => {
                                    const [errors, server] = resp;
                                    if (errors && errors.length) {
                                        return Observable.throw(errors[0]);
                                    }
                                    const output: BrowsersyncInit.Output = {server, options};
                                    return Observable.of(output);
                                });
                        })
                        .map((output) => {
                            return respond([null, output], nextState);
                        })
                        .catch(err => {
                            const nextState = {
                                server: state.server,
                                options: mergedOptions,
                            };
                            const flattened = [].concat(err);
                            return of(respond([flattened, null], nextState));
                        })
                })
        })
    }
}
