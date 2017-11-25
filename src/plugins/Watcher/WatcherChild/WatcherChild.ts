import {Observable} from 'rxjs';
import chokidar = require('chokidar');
import {createFileEvent} from "../FileEvent.message";
import {parse} from "path";
import {WatcherAddItems} from "../AddItems.message";

const debug = require('debug')('bs:WatcherChild');

export enum WatcherChildMessages {
    Start = 'Start',
    Add = 'Add',
    Stop = 'stop',
}

export function WatcherChildFactory(address, context) {
    let watcher;
    let ready = false;
    let parent = context.parent;
    return {
        postStart() {
            debug('postStart()')
        },
        receive: function (name, payload, respond) {
            switch (name) {
                case WatcherChildMessages.Start: {
                    const incoming: WatcherAddItems.Input = payload;
                    debug('chokidar.watch()', incoming);
                    watcher = chokidar.watch(incoming);
                    watcher.on('ready', () => ready = true);
                    watcher.on('change', function(path) {
                        const payload = {
                            event: 'change',
                            path,
                            parsed: parse(path),
                        };
                        debug('File Event', payload.event, payload.path);
                        parent.tell(...createFileEvent(payload)).subscribe();
                    });
                    break;
                }

                case WatcherChildMessages.Add: {
                    debug('watcher.add()', payload);
                    watcher.add(payload);
                    break;
                }

                case WatcherChildMessages.Stop: {
                    debug('watcher.close()');
                    ready = false;
                    watcher.close();
                    respond([null, 'done!']);
                    break;
                }
            }
        },
        postStop() {
            debug('postStop()');
        }
    }
}
