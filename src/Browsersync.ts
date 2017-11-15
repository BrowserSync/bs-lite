import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {DefaultOptions, DefaultOptionsMethods} from "./options";
import {Map} from "immutable";
import {getOptionsAndMiddleware} from "./Browsersync.init";
import {BrowserSyncServer, ServerInit, ServerListeningResponse, ServerMessages} from "./plugins/server";
import {Options} from "./index";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import * as http from "http";
import {ActorRef} from "aktor-js/dist/ActorRef";

const {of, concat} = Observable;

export enum Methods {
    Init = 'init',
    Stop = 'stop',
    GetOption = 'GetOption',
    UpdateOption = 'UpdateOption',
    Address = 'address',
    Listening = 'Listening'
}

interface BrowserSyncState {
    server: ActorRef
    options: Options
}

export interface BrowsersyncInitOutput {
    server: http.Server|null
    options: Options
}

export type BrowsersyncInitResponse = [null|Error[], null|BrowsersyncInitOutput];
export type BrowsersyncStopResponse = [null, string];
export type BrowsersyncListeningResponse = [null, boolean];

export function Browsersync(address: string, context: IActorContext) {

    return {
        initialState: {
            options: Map({}),
            server: context.actorOf(BrowserSyncServer, 'server')
        },
        methods: {
            [Methods.Init]: function (stream: IMethodStream<any, BrowsersyncInitResponse, BrowserSyncState>) {
                return stream.switchMap(({payload, respond, state}) => {
                    return context.actorOf(DefaultOptions)
                        .ask(DefaultOptionsMethods.Merge, payload)
                        .flatMap((mergedOptions) => {
                            const nextState = {
                                server: state.server,
                                options: mergedOptions,
                            }
                            return getOptionsAndMiddleware(context, mergedOptions)
                                .flatMap(({middleware, options}) => {
                                    const payload = {middleware, options};
                                    return state.server
                                        .ask(ServerMessages.Init, payload)
                                        .flatMap((resp: ServerInit.Response) => {
                                            if (resp.errors.length) {
                                                return Observable.throw(resp.errors[0]);
                                            }
                                            const output: BrowsersyncInitOutput = {server: resp.server, options};
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
                                    return of(respond([[err], null], nextState));
                                })
                        })
                })
            },
            [Methods.GetOption]: function (stream) {
                return stream.switchMap(({payload, respond, state}) => {
                    const path: string[] = payload;
                    return of(respond(state.options.getIn(path), state));
                })
            },
            [Methods.UpdateOption]: function (stream) {
                return stream.switchMap(({payload, respond, state}) => {
                    const {path, fn} = payload;
                    const updated = state.options.updateIn(path, fn);
                    state.options = updated;
                    return of(respond(state.options.getIn(path), state));
                })
            },
            [Methods.Address]: function (stream) {
                return stream.switchMap(({payload, respond, state}) => {
                    return state.server.ask(ServerMessages.Address)
                        .map((address) => respond(address, state));
                });
            },
            [Methods.Stop]: function(stream) {
                return stream.switchMap(({payload, respond, state}) => {
                    return state.server.ask(ServerMessages.Stop)
                        .map(() => respond(<BrowsersyncStopResponse>[null, 'All done!'], state));
                });
            },
            [Methods.Listening]: function(stream) {
                return stream.flatMap(({respond, state}) => {
                    return state.server.ask(ServerMessages.Listening)
                        .map((listening: ServerListeningResponse) => respond(<BrowsersyncListeningResponse>listening, state));
                });
            }
        }
    }
}
