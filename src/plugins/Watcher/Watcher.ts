import {Observable} from 'rxjs';
import {WatcherObjectInput} from './Init.message';
import {BSError} from "../../errors";
import {initHandler, WatcherItem} from "./Init.message";
import {addItemsHandler} from "./AddItems.message";
import EventEmitter = NodeJS.EventEmitter;

export enum WatcherMessages {
    Init = 'init',
    AddItems = 'AddItems',
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
        initialState: {
            watchers: {
                core: {
                    watcher: null,
                    items: []
                }
            },
        },
        postStart() {
            console.log('post start');
        },
        methods: {
            [WatcherMessages.Init]: initHandler,
            [WatcherMessages.AddItems]: addItemsHandler,
        }
    }
}