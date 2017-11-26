import {Observable} from 'rxjs';
import {BSError} from "../../errors";
import {getInitHandler, WatcherItem} from "./Init.message";
import {getAddItemsHandler} from "./AddItems.message";
import EventEmitter = NodeJS.EventEmitter;
import {getStopHandler} from "./Stop.message";
import {getFileEventHandler} from "./FileEvent.message";
import {MessageResponse} from "aktor-js";
import {BsOptions} from "../../options";
const debug = require('debug')('bs:Watcher');

const { of } = Observable;

export enum WatcherMessages {
    Init = 'init',
    AddItems = 'AddItems',
    Stop = 'stop',
    FileEvent = 'FileEvent',
    Activate = 'Activate',
    Deactivate = 'Deactivate',
}

export interface NamespacedWatcher {
    watcher: EventEmitter,
    items: WatcherItem
}

export type WatcherState = BsOptions['watch'];

export function WatcherFactory(address, context): any {
    return {
        initialState: {},
        postStart() {
            // console.log('post start');
        },
        methods: {
            [WatcherMessages.Init]: getInitHandler(context),
            [WatcherMessages.AddItems]: getAddItemsHandler(context),
            [WatcherMessages.Stop]: getStopHandler(context),
            [WatcherMessages.FileEvent]: getFileEventHandler(context),
            [WatcherMessages.Activate]: function(stream) {
                return stream.map(({state, respond}) => {
                    debug('WatcherMessages.Activate');
                    const nextState = {
                        ...state,
                        active: true,
                    };
                    return respond([null, 'ok!'], nextState);
                })
            },
            [WatcherMessages.Deactivate]: function(stream) {
                return stream.map(({state, respond}) => {
                    debug('WatcherMessages.Deactivate');
                    const nextState = {
                        ...state,
                        active: false,
                    };
                    return respond([null, 'ok!'], nextState);
                })
            },
        },
        postStop(){
            // console.log('watcher stopped');
        }
    }
}
