import {Observable} from 'rxjs';
import {Set} from 'immutable';
import {IActorContext, IMethodStream, MessageResponse} from "aktor-js";
import {WatcherMessages} from "../Watcher/Watcher";
import {WatcherAddItems, WatcherNamespace} from "../Watcher/AddItems.message";
import {next} from "@kwonoj/rxjs-testscheduler-compat";
import {Methods} from "../../Browsersync";
const debug = require('debug')('bs:ProxiedFiles');

const {of} = Observable;

export enum ProxiedFilesMessages {
    Init     = 'Init',
    AddFile  = 'AddFile',
    Stop     = 'Stop',
}

export namespace ProxiedFilesAdd {
    export type Input = {path: string};
    export type Response = [null, boolean];
}

export namespace ProxiedFilesStop {
    export type Response = [null, string];
}

export namespace ProxiedFilesInit {
    export type Response = [null, string];
}

type ProxiedFilesState = Set<string>;

export function ProxiedFilesFactory(address: string, context: IActorContext): any {
    return {
        initialState: Set([]),
        methods: {
            [ProxiedFilesMessages.AddFile]: function(stream: IMethodStream<ProxiedFilesAdd.Input, ProxiedFilesAdd.Response, ProxiedFilesState>) {
                return stream
                    .flatMap(({payload, state, respond}) => {
                        if (state.contains(payload.path)) {
                            return of(respond([null, false], state));
                        }
                        const nextState = state.add(payload.path);
                        return of(respond([null, true], nextState));
                    });
            },
            [ProxiedFilesMessages.Init]: function(stream: IMethodStream<void, ProxiedFilesInit.Response, ProxiedFilesState>) {
                return stream.map(({respond, state}) => {
                    debug(`init, clearing ${state.size} items`);
                    const nextState = Set([]);
                    return respond([null, 'ok'], nextState);
                })
            }
        }
    }
}
