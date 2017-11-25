import {Observable} from 'rxjs';
import {ClientMessages} from "../Sockets/Clients/Clients";
import {IMethodStream, IActorContext} from "aktor-js";
import {ParsedPath} from "path";
import {WatcherMessages} from "./Watcher";
const debug = require('debug')('bs:Watcher:FileEvent');

const { empty } = Observable;

export namespace FileEvent {
    export type Input = {
        event: string,
        path: string,
        parsed: ParsedPath
    }
}

export function createFileEvent(payload: FileEvent.Input) {
    return [WatcherMessages.FileEvent, payload];
}

export function getFileEventHandler(context: IActorContext): any {
    return function(stream: IMethodStream<any, FileEvent.Input, void>) {
        return stream.flatMap(({payload}) => {
            const sockets = context.actorSelection('/system/core/server/sockets/clients')[0];

            if (sockets) {
                debug('sockets available, sending', ClientMessages.Reload);
                return sockets.tell(ClientMessages.Reload, payload);
            }

            return empty();
        });
    }
}
