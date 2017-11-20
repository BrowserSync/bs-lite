import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {SocketsMessages} from "../Sockets/Sockets";
import {ClientMessages} from "../Sockets/Clients/Clients";

const { empty } = Observable;

export namespace FileEvent {
    export type Input = { event: 'change', path: string }
}

export function getFileEventHandler(context: IActorContext) {
    return function(stream: IMethodStream<any, FileEvent.Input, void>) {
        return stream.flatMap(({payload}) => {
            const sockets = context.actorSelection('/system/core/server/sockets/clients')[0];
            if (sockets) {
                return sockets.tell(ClientMessages.Reload, payload);
            }
            return empty();
        });
    }
}