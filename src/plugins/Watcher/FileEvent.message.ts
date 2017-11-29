import {Observable} from 'rxjs';
import {ClientMessages} from "../Sockets/Clients/Clients";
import {IMethodStream, IActorContext} from "aktor-js";
import {ParsedPath} from "path";
import {WatcherMessages, WatcherState} from "./Watcher";
import {WatcherNamespace} from "./AddItems.message";
const debug = require('debug')('bs:Watcher:FileEvent');

const { empty, of } = Observable;

export namespace FileEvent {
    export type Input = {
        event: string,
        path: string,
        parsed: ParsedPath,
        ns: WatcherNamespace
    }
    export type Response = [null, string];
}

export function createFileEvent(payload: FileEvent.Input) {
    return [WatcherMessages.FileEvent, payload];
}

export function getFileEventHandler(context: IActorContext): any {
    return function(stream: IMethodStream<FileEvent.Input, FileEvent.Response, WatcherState>) {
        return stream.flatMap(({payload, state, respond}) => {
            const sockets = context.actorSelection('/system/core/server/sockets/clients')[0];

            if (sockets) {
                if (payload.ns === WatcherNamespace.FilesOption) {
                    debug(`ns is ${WatcherNamespace.FilesOption}, sending`, ClientMessages.Reload);
                    return sockets.tell(ClientMessages.Reload, payload)
                        .mapTo(respond([null, 'ok!'], state))
                }
                if (payload.ns === WatcherNamespace.WatchOption) {
                    if (state.active) {
                        debug(`ns is ${WatcherNamespace.WatchOption} && state.active=true, sending`, ClientMessages.Reload);
                        return sockets.tell(ClientMessages.Reload, payload)
                            .mapTo(respond([null, 'ok!'], state));
                    }
                }
            }

            debug('Not emitting this messsage', ClientMessages.Reload, payload);

            return of(true).mapTo(respond([null, 'skipped!'], state));
        });
    }
}
