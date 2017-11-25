import {Observable} from 'rxjs';
import {WatcherObjectInput} from '../Init.message';
import {BSError} from "../../../errors";
import {initHandler, WatcherItem} from "../Init.message";
import {getAddItemsHandler} from "../AddItems.message";
import EventEmitter = NodeJS.EventEmitter;
import chokidar = require('chokidar');
import {WatcherMessages} from "../Watcher";
import {FileEvent} from "../FileEvent.message";
import {parse} from "path";

export enum WatcherChild {
    Init = 'init',
}

export function WatcherChildFactory(address, context) {
    let watcher;
    let parent = context.parent;
    return {
        receive: function (name, payload, respond) {
            switch (name) {
                case 'start': {
                    watcher = chokidar.watch(payload);
                    watcher.on('change', function(path) {
                        const payload: FileEvent.Input = {
                            event: 'change',
                            path,
                            parsed: parse(path),
                        };
                        parent.tell(WatcherMessages.FileEvent, payload).subscribe();
                    });
                    break;
                }
                case 'add': {
                    watcher.add(payload);
                    break;
                }
                case 'stop': {
                    watcher.close();
                    respond([null, 'done!']);
                    break;
                }
            }
        },
        postStop() {
            // console.log('child stopped');
        }
    }
}
