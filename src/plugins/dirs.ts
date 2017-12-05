import {Observable} from "rxjs";
import {Set} from 'immutable';
import {IActorContext, IMethodStream} from "aktor-js";
import {getDirs$} from "../utils";

const {of} = Observable;

export enum DirsMesages {
    Get = 'Get'
}

export namespace DirsGet {
    export type Input = { target: string, cwd: string, }
    export type Response = [Error|null, string[]];
    export function create(target: string, cwd: string): [DirsMesages.Get, Input] {
        return [DirsMesages.Get, {target, cwd}];
    }
}

type DirsState = Set<string>;

export function DirsFactory(address, context: IActorContext): any {
    return {
        initialState: Set([]),
        methods: {
            [DirsMesages.Get]: function(stream: IMethodStream<DirsGet.Input, DirsGet.Response, DirsState>) {
                return stream
                    .switchMap(({payload, respond, state}) => {
                        if (state.size) {
                            return of(respond([null, state.toArray()], state));
                        }
                        return getDirs$(payload.target, payload.cwd)
                            .toArray()
                            .map(dirs => {
                                const nextState = (state.concat(dirs) as Set<string>);
                                return respond([null, nextState.toArray()], nextState);
                            });
                    });
            }
        }
    }
}
