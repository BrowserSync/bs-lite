import {Observable} from 'rxjs';
import {Set} from 'immutable';
import {IActorContext, IMethodStream, MessageResponse} from "aktor-js";
import {WatcherMessages} from "../Watcher/Watcher";
import {WatcherAddItems, WatcherNamespace} from "../Watcher/AddItems.message";
import {next} from "@kwonoj/rxjs-testscheduler-compat";
const debug = require('debug')('bs:ServedFiles');

const {of} = Observable;

export enum ServedFilesMessages {
    Init     = 'Init',
    AddFile  = 'AddFile',
    Stop     = 'Stop',
}

export namespace ServedFilesAdd {
    export type Input = {cwd: string, path: string};
    export type Response = [null, boolean];
}


export namespace ServedFilesStop {
    export type Response = [null, string];
}

export namespace ServedFilesInit {
    export type Response = [null, string];
}

type ServedFilesState = Set<string>;

export function ServedFilesFactory(address, context): any {
    return {
        initialState: Set([]),
        methods: {
            [ServedFilesMessages.AddFile]: function(stream: IMethodStream<ServedFilesAdd.Input, ServedFilesAdd.Response, ServedFilesState>) {
                return stream.flatMap(({payload, respond, state}) => {

                    const watcher = context.actorSelection('/system/core/watcher')[0];

                    if (!watcher) {
                        return of(respond([null, false], state));
                    }

                    // TODO: skip duplicates somewhere
                    if (state.contains(payload.path)) {
                        return of(respond([null, false], state));
                    }

                    const watchpayload = WatcherAddItems.create({
                        ns: WatcherNamespace.WatchOption,
                        items: [payload.path]
                    });

                    const nextState = state.add(payload.path);
                    const response = respond([null, true], nextState);

                    return watcher
                        .tell(...watchpayload)
                        .mapTo(response);
                })
            },
            [ServedFilesMessages.Stop]: function(stream: IMethodStream<void, ServedFilesStop.Response, ServedFilesState>) {
                return stream.map(({respond, state}) => {
                    return respond([null, 'ok'], state);
                })
            },
            [ServedFilesMessages.Init]: function(stream: IMethodStream<void, ServedFilesInit.Response, ServedFilesState>) {
                return stream.map(({respond, state}) => {
                    debug(`init, clearing ${state.size} items`);
                    const nextState = Set([]);
                    return respond([null, 'ok'], nextState);
                })
            }
        }
    }
}
