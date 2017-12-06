import {Observable} from "rxjs";
import {Set} from 'immutable';
import {IActorContext, IMethodStream} from "aktor-js";
import {getDirs$} from "../utils";
const debug = require('debug')('bs:dirs');

const {of} = Observable;

export enum DirsMesages {
    Get = 'Get'
}

export namespace DirsGet {
    export type Input = { baseDirectory: string, cwd: string, }
    export type Response = [Error|null, string[]];
    export function create(baseDirectory: string, cwd: string): [DirsMesages.Get, Input] {
        return [DirsMesages.Get, {baseDirectory, cwd}];
    }
}

type DirsState = Set<string>;

export function DirsFactory(address, context: IActorContext): any {
    return {
        initialState: Set([]),
        methods: {
            [DirsMesages.Get]: function(stream: IMethodStream<DirsGet.Input, DirsGet.Response, DirsState>) {
                return stream
                    .flatMap(({payload, respond, state}) => {
                        // if (state.size) {
                        //     return of(respond([null, state.toArray()], state));
                        // }
                        return Observable.of(true)
                            .timestamp()
                            .flatMap(({timestamp}) => {
                                return getDirs$(payload.baseDirectory, payload.cwd)
                                    .toArray()
                                    .timestamp()
                                    .map(({timestamp: finished, value}) => {
                                        debug(payload.baseDirectory, value.length, 'results in', `${finished - timestamp}ms`);
                                        const nextState = (state.concat(value) as Set<string>);
                                        return respond([null, nextState.toArray()], nextState);
                                    });
                            })
                    });
            }
        }
    }
}
