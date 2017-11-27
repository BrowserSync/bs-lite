import {Observable} from 'rxjs';
import {Set} from 'immutable';
import {IMethodStream, MessageResponse} from "aktor-js";
import {WatcherMessages} from "../Watcher/Watcher";
import {WatcherAddItems} from "../Watcher/AddItems.message";

const {of} = Observable;

export enum ServedFilesMessages {
    AddFile  = 'AddFile',
    GetFiles = 'GetFiles',
    Stop     = 'Stop',
}

export namespace ServedFilesFile {
    export type Input = {cwd: string, path: string};
    export type Response = [null, boolean];
}

export namespace ServedFilesGetFiles {
    export type Response = [null, string[]];
}

export namespace ServedFilesStop {
    export type Response = [null, string];
}

export function ServedFilesFactory(address, context): any {
    return {
        initialState: Set([]),
        methods: {
            [ServedFilesMessages.AddFile]: function(stream: IMethodStream<ServedFilesFile.Input, ServedFilesFile.Response, any>) {
                return stream.flatMap(({payload, respond, state}) => {

                    const watcher = context.actorSelection('/system/core/watcher')[0];

                    if (!watcher) {
                        return of(respond([null, false], state));
                    }

                    // TODO: skip duplicates somewhere
                    // if (state.contains(payload.path)) {
                    //     return of(respond([null, false], state));
                    // }

                    const watchpayload: WatcherAddItems.Input = {
                        ns: 'core',
                        items: [payload.path]
                    };

                    const nextState = state.add(payload.path);
                    const response = respond([null, true], nextState);

                    return watcher
                        .tell(WatcherAddItems.Name, watchpayload)
                        .mapTo(response);
                })
            },
            [ServedFilesMessages.GetFiles]: function(stream: IMethodStream<void, ServedFilesFile.Response, any>) {
                return stream.map(({respond, state}) => {
                    return respond([null, state.toArray()], state);
                })
            },
            [ServedFilesMessages.Stop]: function(stream: IMethodStream<void, ServedFilesStop.Response, any>) {
                return stream.map(({respond, state}) => {
                    return respond([null, 'ok'], state);
                })
            },
        }
    }
}
