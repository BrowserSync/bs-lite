import {Observable} from 'rxjs';
import {Set} from 'immutable';
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";

export enum ServedFilesMessages {
    AddFile = 'AddFile',
    GetFiles = 'GetFiles',
}

export namespace ServedFilesFile {
    export type Input = {cwd: string, path: string};
    export type Response = [null, boolean];
}

export namespace ServedFilesGetFiles {
    export type Response = [null, string[]];
}

export function ServedFilesFactory(address, context) {
    return {
        initialState: Set([]),
        methods: {
            [ServedFilesMessages.AddFile]: function(stream: IMethodStream<ServedFilesFile.Input, ServedFilesFile.Response, any>) {
                return stream.map(({payload, respond, state}) => {
                    const nextState = state.add(payload.path);
                    return respond([null, true], nextState);
                })
            },
            [ServedFilesMessages.GetFiles]: function(stream: IMethodStream<void, ServedFilesFile.Response, any>) {
                return stream.map(({respond, state}) => {
                    return respond([null, state.toArray()], state);
                })
            },
        }
    }
}