import {Observable} from 'rxjs';
import {WatcherObjectInput} from './Init.message';
import {BSError} from "../../errors";
import {initHandler, WatcherItem} from "./Init.message";
import {getAddItemsHandler} from "./AddItems.message";
import EventEmitter = NodeJS.EventEmitter;
import {from} from "rxjs/observable/from";
import {stopChildren} from "../../utils";

const { of } = Observable;

export enum WatcherMessages {
    Init = 'init',
    AddItems = 'AddItems',
    Stop = 'stop',
}

export interface NamespacedWatcher {
    watcher: EventEmitter,
    items: WatcherItem
}

export interface WatcherState {
    watchers: {[index: string]: NamespacedWatcher}
}

export function WatcherFactory(address, context) {
    return {
        postStart() {
            // console.log('post start');
        },
        methods: {
            [WatcherMessages.Init]: initHandler,
            [WatcherMessages.AddItems]: getAddItemsHandler(context),
            [WatcherMessages.Stop]: function(stream) {
                return stream.flatMap(({respond}) => {
                    return stopChildren(context)
                        .mapTo(respond([null, 'done!']));
                });
            },
        },
        postStop(){
            // console.log('watcher stopped');
        }
    }
}