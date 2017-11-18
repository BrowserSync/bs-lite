import {Observable} from 'rxjs';
import {Set} from 'immutable';
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";

export enum ServedFilesMessages {
    File = 'File'
}

export namespace ServedFilesFile {
    export type Input = {cwd: string, path: string};
    export type Response = [null, boolean];
}

export function ServedFilesFactory(address, context) {
    return {
        initialState: Set([]),
        methods: {
            [ServedFilesMessages.File]: function(stream: IMethodStream<ServedFilesFile.Input, ServedFilesFile.Response, any>) {
                return stream.map(({payload, respond, state}) => {
                    const nextState = state.add(payload.path);
                    return respond([null, true], nextState);
                })
            }
        }
    }
}