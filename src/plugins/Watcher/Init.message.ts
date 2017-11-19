import {Observable} from 'rxjs';
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {BSError} from "../../errors";
import {WatcherState} from "./Watcher";

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

export function initHandler(stream: IMethodStream<WatcherInit.Input, any, WatcherState>) {
    return stream.switchMap(({payload, respond, state}) => {
        console.log('Watcher init');
        return of(respond([null, 'yay!'], state))
    });
}
