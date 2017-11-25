import {Observable} from 'rxjs';
import {ClientMessages, ClientReloadMessage} from "../Sockets/Clients/Clients";
import {IMethodStream, MessageResponse, IActorContext} from "aktor-js";
import {ParsedPath} from "path";

const { empty } = Observable;

export namespace FileEvent {
    export type Input = { event: 'change', path: string, parsed: ParsedPath }
}

export function getFileEventHandler(context: IActorContext): any {
    return function(stream: IMethodStream<any, FileEvent.Input, void>) {
        return stream.flatMap(({payload}) => {
            const sockets = context.actorSelection('/system/core/server/sockets/clients')[0];
            if (sockets) {
                return sockets.tell(<ClientReloadMessage.Name>ClientMessages.Reload, <ClientReloadMessage.Payload>payload);
            }
            return empty();
        });
    }
}
