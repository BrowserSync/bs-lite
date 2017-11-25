import {Observable} from 'rxjs';
import {BSError} from "../../errors";
import {WatcherState} from "./Watcher";
import {IMethodStream, MessageResponse} from "aktor-js";

const {of} = Observable;

export interface WatcherObjectInput {
    patterns: string[];
    fn: string;
    id?: string;
}

export interface WatcherItem {
    patterns: string[];
    fn(event: string, path: string, stat?: object): void;
    id: string;
}

export type WatcherInput = string|string[]|WatcherObjectInput|WatcherObjectInput[];

export namespace WatcherInit {
    export type Input = WatcherInput;
    export type Response = [null|BSError[], null|string];
}

export function initHandler(stream: IMethodStream<WatcherInit.Input, any, WatcherState>): any {
    return stream.switchMap(({payload, respond, state}) => {
        return of(respond([null, 'yay!'], state))
    });
}
