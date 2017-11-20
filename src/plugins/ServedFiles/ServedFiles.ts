import {Observable} from 'rxjs';
import {Set} from 'immutable';
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {WatcherMessages} from "../Watcher/Watcher";
import {WatcherAddItems} from "../Watcher/AddItems.message";

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

export function ServedFilesFactory(address, context) {
    return {
        initialState: Set([]),
        methods: {
            [ServedFilesMessages.AddFile]: function(stream: IMethodStream<ServedFilesFile.Input, ServedFilesFile.Response, any>) {
                return stream.map(({payload, respond, state}) => {
                    const watchpayload: WatcherAddItems.Input = {
                        ns: 'core',
                        items: [payload.path]
                    };
                    context.actorSelection('/system/core/watcher')[0]
                        .tell(WatcherMessages.AddItems, watchpayload)
                        .subscribe();
                    const nextState = state.add(payload.path);
                    return respond([null, true], nextState);
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