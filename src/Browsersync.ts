import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {DefaultOptions} from "./options";
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

    // Internal state of this actor's entire lifespan
    const state = {
        options: Map({}),
        server: context.actorOf(Server, 'server')
    };

    return {
        methods: {
            [Methods.init]: function (stream) {
                return stream.switchMap(({payload, respond}) => {
                    return context.actorOf(DefaultOptions)
                        .ask('merge', payload)
                        .do(merged => {
                            // save each processed state side effect
                            // console.log(merged);
                            state.options = merged;
                        })
                        .flatMap((mergedOptions) => {
                            return createWithOptions(context, mergedOptions)
                                .map(respond);
                        });
                })
            },
            [Methods.getOption]: function (stream) {
                return stream.switchMap(({payload, respond}) => {
                    const path: string[] = payload;
                    return of(respond(state.options.getIn(path)));
                })
            },
            [Methods.updateOption]: function (stream) {
                return stream.switchMap(({payload, respond}) => {
                    const {path, fn} = payload;
                    const updated = state.options.updateIn(path, fn);
                    state.options = updated;
                    return of(respond(state.options.getIn(path)));
                })
            },
            [Methods.address]: function (stream) {
                return stream.switchMap(({payload, respond}) => {
                    return state.server.ask('address')
                        .map(respond);
                });
            },
            [Methods.stop]: function(stream) {
                return stream.switchMap(({payload, respond}) => {
                    return context.gracefulStop(state.server)
                        .map(() => respond('All done!'));
                });
            }
        }
    }
}