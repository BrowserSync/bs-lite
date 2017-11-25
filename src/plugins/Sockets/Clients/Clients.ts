import {Observable} from 'rxjs';
import {SocketsMessages} from "../Sockets";
import {BrowserMessages, BrowserReload} from "./Messages";
import {patterns, IActorContext, IncomingMessage} from "aktor-js";
import {FileEvent} from "../../Watcher/FileEvent.message";

const {empty} = Observable;

export enum ClientMessages {
    Reload = 'Reload',
}

export namespace ClientReloadMessage {
    export type Name = ClientMessages.Reload;
    export type Payload = FileEvent.Input
}

const handlers = {
    [ClientMessages.Reload]: (stream: Observable<IncomingMessage>, context: IActorContext) => {
        return stream
            /**
             * Group incoming messages
             */
            .buffer(stream.debounceTime(500, context.timeScheduler))
            /**
             * Take a group of messages, and determine which action to
             * send to the browser
             */
            .flatMap((messages: IncomingMessage[]) => {
                /**
                 * Construct the outgoing payload (to the browser)
                 */
                const emitPayload: BrowserReload.Message = {
                    name: BrowserMessages.BrowserReload,
                    payload: {
                        force: true,
                        reason: BrowserReload.Reasons.FileChanged,
                        items: messages.map(message => message.message.action.payload)
                    }
                };

                return context.parent.tell(SocketsMessages.Emit, emitPayload)
                    .mapTo(patterns.createResponse(messages[0], 'ok!'));
            });

    }
};

export function ClientsFactory(address: string, context: IActorContext) {
    return {
        setupReceive(incoming) {
            return incoming
                .groupBy(x => x.message.action.type)
                .flatMap((obs) => {
                    const messageName = obs.key;
                    const handler = handlers[messageName];
                    if (typeof handler === 'function') {
                        return handler(obs, context);
                    }
                    console.log(`Handler not implemented for ${obs.key}`);
                    return empty();
                })
        }
    }
}
