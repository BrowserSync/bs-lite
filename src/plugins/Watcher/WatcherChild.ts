import {Observable} from 'rxjs';
import {WatcherObjectInput} from './Init.message';
import {BSError} from "../../errors";
import {initHandler, WatcherItem} from "./Init.message";
import {getAddItemsHandler} from "./AddItems.message";
import EventEmitter = NodeJS.EventEmitter;
import chokidar = require('chokidar');

export enum WatcherChild {
    Init = 'init',
}



export function WatcherChildFactory(address, context) {
    let watcher;
    return {
        receive: function (name, payload, respond) {
            switch (name) {
                case 'start': {
                    watcher = chokidar.watch(payload);
                    watcher.on('change', function() {
                        console.log('change');
                    });
                    break;
                }
                case 'stop': {
                    watcher.close();
                    respond([null, 'done!']);
                }
            }
        },
        postStop() {
            console.log('child stopped');
        }
    }
}