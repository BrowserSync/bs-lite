import {Observable} from 'rxjs';
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {BSError} from "../../errors";
import {WatcherInput} from "./Init.message";
import {WatcherState} from "./Watcher";

const {of} = Observable;

export namespace WatcherAddItems {
    export type Input = {
        ns: string,
        items: WatcherInput,
    };
    export type Response = [null|BSError[], null|string];
}

export function addItemsHandler(stream: IMethodStream<WatcherAddItems.Input, WatcherAddItems.Response, WatcherState>) {
    return stream.switchMap(({payload, respond, state}) => {
        const matching = state.watchers[payload.ns];
        if (matching) {
            if (!matching.watcher) {
                console.log('Add watcher here');
            }
        }
        return of(respond([null, 'yay!'], state))
    });
}
