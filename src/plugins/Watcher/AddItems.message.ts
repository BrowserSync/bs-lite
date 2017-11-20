import {Observable} from 'rxjs';
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {BSError} from "../../errors";
import {WatcherInput} from "./Init.message";
import {WatcherState} from "./Watcher";
import chokidar = require('chokidar');
import {IActorContext} from "aktor-js/dist/ActorContext";
import {WatcherChildFactory} from "./WatcherChild";

const {of} = Observable;

export namespace WatcherAddItems {
    export type Input = {
        ns: string,
        items: WatcherInput,
    };
    export type Response = [null|BSError[], null|string];
}

export function getAddItemsHandler(context: IActorContext) {
    return function addItemsHandler(stream: IMethodStream<WatcherAddItems.Input, WatcherAddItems.Response, WatcherState>) {
        return stream.switchMap(({payload, respond, state}) => {
            const match = context.actorSelection(payload.ns)[0];
            if (!match) {
                // const a = context.actorOf(WatcherChildFactory, payload.ns);
                // return a.ask('start', payload.items)
                //     .flatMap((resp) => {
                //         console.log(resp);
                //         return of(respond([null, 'yay!']))
                //     })
            }
            return of(respond([null, 'yay!'], state))
        });
    }
}
