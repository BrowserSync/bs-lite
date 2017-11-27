import {Observable} from 'rxjs';
import {BrowserSyncState, CoreChildren} from "../Browsersync";
import {BsOptions, DefaultOptions, DefaultOptionsMethods} from "../options";
import {getOptionsAndMiddleware} from "../Browsersync.init";
import {ServerMessages} from "../plugins/Server/Server";
import * as http from "http";
import {Options} from "../index";
import {IMethodStream, IActorContext} from "aktor-js";
import {ServerInit} from "../plugins/Server/Init.message";
import {WatcherMessages} from "../plugins/Watcher/Watcher";
import {ServedFilesMessages} from "../plugins/ServedFiles/ServedFiles";

const {of, merge} = Observable;

export namespace BrowsersyncInit {
    export type Output = {
        server: http.Server|null
        options: Options
    }
    export type Response = [null|Error[], null|Output];
    export type Input = object;
}

export function initMessageHandler(context: IActorContext): any {
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
                            const payload     = {middleware, options};
                            const watcher     = context.actorSelection('/system/core/watcher')[0];
                            const servedFiles = context.actorSelection(`/system/core/${CoreChildren.ServedFiles}`)[0];
                            const watcherPayload: BsOptions['watch'] = options.get('watch').toJS();
                            return merge(
                                // start the server + sockets
                                state.server
                                    .ask(ServerMessages.Init, payload)
                                    .flatMap((resp: ServerInit.Response) => {
                                        const [errors, server] = resp;
                                        if (errors && errors.length) {
                                            return Observable.throw(errors[0]);
                                        }
                                        const output: BrowsersyncInit.Output = {server, options};
                                        return of(output);
                                    }),
                                // start the watcher
                                watcher.ask(WatcherMessages.Init, watcherPayload).ignoreElements(),
                                servedFiles.ask(ServedFilesMessages.Init).ignoreElements(),
                            );
                        })
                        .map((output: BrowsersyncInit.Output) => {
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
