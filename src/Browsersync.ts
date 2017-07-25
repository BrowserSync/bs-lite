import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {DefaultOptions, DefaultOptionsMethods} from "./options";
import {Map} from "immutable";
import {createWithOptions} from "./Browsersync.init";
import {Server} from "./plugins/server";

const {of, concat} = Observable;

export enum Methods {
    init = 'init',
    stop = 'stop',
    getOption = 'getOption',
    updateOption = 'updateOption',
    address = 'address'
}

export function Browsersync(address: string, context: IActorContext) {

    return {
        initialState: {
            options: Map({}),
            server: context.actorOf(Server, 'server')
        },
        methods: {
            [Methods.init]: function (stream) {
                return stream.switchMap(({payload, respond, state}) => {
                    return context.actorOf(DefaultOptions)
                        .ask(DefaultOptionsMethods.Merge, payload)
                        .flatMap((mergedOptions) => {
                            const nextState = {
                                server: state.server,
                                options: mergedOptions,
                            }
                            return createWithOptions(context, mergedOptions)
                                .map((output) => respond(output, nextState));
                        });
                })
            },
            [Methods.getOption]: function (stream) {
                return stream.switchMap(({payload, respond, state}) => {
                    const path: string[] = payload;
                    return of(respond(state.options.getIn(path), state));
                })
            },
            [Methods.updateOption]: function (stream) {
                return stream.switchMap(({payload, respond, state}) => {
                    const {path, fn} = payload;
                    const updated = state.options.updateIn(path, fn);
                    state.options = updated;
                    return of(respond(state.options.getIn(path), state));
                })
            },
            [Methods.address]: function (stream) {
                return stream.switchMap(({payload, respond, state}) => {
                    return state.server.ask('address')
                        .map((address) => respond(address, state));
                });
            },
            [Methods.stop]: function(stream) {
                return stream.switchMap(({payload, respond, state}) => {
                    return context.gracefulStop(state.server)
                        .map(() => respond('All done!', state));
                });
            }
        }
    }
}