import {Observable} from 'rxjs';
import {BSError} from "../../errors";
import {WatcherInput} from "./Init.message";
import {WatcherState} from "./Watcher";
import {WatcherChildFactory} from "./WatcherChild/WatcherChild";
import {IActorContext, MessageResponse, IMethodStream} from "aktor-js";

const {of} = Observable;

export namespace WatcherAddItems {
    export type Input = {
        ns: string,
        items: WatcherInput,
    };
    export type Response = [null|BSError[], null|string];
}

export function getAddItemsHandler(context: IActorContext): any {
    return function addItemsHandler(stream: IMethodStream<WatcherAddItems.Input, WatcherAddItems.Response, WatcherState>) {
        return stream.switchMap(({payload, respond, state}) => {
            const match = context.actorSelection(payload.ns)[0];

            if (!match) {
                const a = context.actorOf(WatcherChildFactory, payload.ns);
                return a.ask('start', payload.items)
                    .flatMap(() => {
                        return of(respond([null, 'yay!']))
                    })
            }

            return match
                .tell('add', payload.items)
                .mapTo(respond([null, 'yay!'], state));
        });
    }
}
