import {Observable} from 'rxjs';
import {Set} from 'immutable';
import {IActorContext, IMethodStream} from "aktor-js";
import {addFileHandler, ProxiedFilesAdd} from "./AddFile.message";

const debug = require('debug')('bs:ProxiedFiles');

export enum ProxiedFilesMessages {
    Init = 'Init',
    AddFile = 'AddFile',
    Stop = 'Stop',
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
            [ProxiedFilesMessages.AddFile]: function (stream: IMethodStream<ProxiedFilesAdd.Input, ProxiedFilesAdd.Response, ProxiedFilesState>) {
                return stream
                    .buffer(stream.debounceTime(1000, context.timeScheduler))
                    .do(xs => debug('buffered', xs.length, ProxiedFilesMessages.AddFile, 'messages'))
                    .flatMap((items) => {
                        return addFileHandler(context, items);
                    })
            },
            [ProxiedFilesMessages.Init]: function (stream: IMethodStream<void, ProxiedFilesInit.Response, ProxiedFilesState>) {
                return stream.map(({respond, state}) => {
                    debug(`init, clearing ${state.size} items`);
                    const nextState = Set([]);
                    return respond([null, 'ok'], nextState);
                })
            }
        }
    }
}
