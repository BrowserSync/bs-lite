import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {DefaultOptions, DefaultOptionsMethods} from "./options";
import {Map} from "immutable";
import {createWithOptions} from "./Browsersync.init";
import {Server, ServerMessages} from "./plugins/server";
import {Options} from "./index";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import * as http from "http";

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
    server: http.Server|null
    options: Options
}

export interface BrowsersyncInitOutput {
    server: http.Server|null
    options: Options
}

export interface BrowsersyncInitResponse {
    output: BrowsersyncInitOutput
    errors: Error[]
}

export function Browsersync(address: string, context: IActorContext) {

    return {
        initialState: {
            options: Map({}),
            server: context.actorOf(Server, 'server')
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
                            return createWithOptions(context, mergedOptions)
                                .map((output) => respond({output, errors: []}, nextState))
                                .catch(err => {
                                    const nextState = {
                                        server: null,
                                        options: mergedOptions,
                                    };
                                    return of(respond({errors: [err], output: null}, nextState));
                                })
                        });
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
                        .map(() => respond('All done!', state));
                });
            },
            [Methods.Listening]: function(stream) {
                return stream.flatMap(({payload, respond, state}) => {
                    return state.server.ask(ServerMessages.Listening)
                        .map(listening => respond(listening, state));
                });
            }
        }
    }
}