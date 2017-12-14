import {Observable} from 'rxjs';
import {BSError} from "../../errors";
import {WatcherInput} from "./Init.message";
import {WatcherMessages, WatcherState} from "./Watcher";
import {WatcherChildFactory, WatcherChildMessages} from "./WatcherChild/WatcherChild";
import {IActorContext, MessageResponse, IMethodStream} from "aktor-js";
import {WatchOptions} from "chokidar";
const debug = require('debug')('bs:Watcher:AddItems');

const {of} = Observable;

export enum WatcherNamespace {
    FilesOption = 'user-option-files',
    WatchOption = 'user-option-watch',
}

export namespace WatcherAddItems {
    export const Name = WatcherMessages.AddItems;
    export type Input = {
        ns: WatcherNamespace,
        items: WatcherInput,
        options?: WatchOptions,
    };
    export type Response = [null|BSError[], null|string];
    export function create(payload: Input): [WatcherMessages.AddItems, Input] {
        return [Name, payload];
    }
}

export function getAddItemsHandler(context: IActorContext): any {
    return function addItemsHandler(stream: IMethodStream<WatcherAddItems.Input, WatcherAddItems.Response, WatcherState>) {
        return stream
            // .do(({state}) => console.log(state))
            .flatMap(({payload, respond, state}) => {

                if (payload.ns === WatcherNamespace.WatchOption && !state.active) {
                    debug('Not adding files, auto-watcher is not active');
                    return of(respond([null, 'not active!'], state))
                }

                /**
                 * Does an actor already exist for this NS?
                 * eg: /system/core/watcher/some-ns?
                 */
                const match = context.actorSelection(payload.ns)[0];

                /**
                 * If this NS already existed as a child actor,
                 * just send a message with the new items.
                 */
                if (match) {
                    return match
                        .tell(WatcherChildMessages.Add, payload.items)
                        .mapTo(respond([null, 'yay!'], state));
                }

                /**
                 * If not, create it. this will create children eg:
                 *
                 * /system/core/watcher/some-ns
                 * /system/core/watcher/some-plugin
                 */
                const a = context.actorOf(state.WatcherChildFactory || WatcherChildFactory, payload.ns);
                const options = payload.options || state.options;
                return a.tell(WatcherChildMessages.Start, {...payload, options})
                    .mapTo(respond([null, 'yay!'], state));
        });
    }
}
