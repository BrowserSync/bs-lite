import {Observable} from 'rxjs';
import {FileEvent} from "../../Watcher/FileEvent.message";
import {IActorContext, IncomingMessage, patterns} from "aktor-js";
import {BrowserMessages, BrowserReload} from "./BrowserMessageTypes";
import {SocketsMessages} from "../Sockets";
const debug = require('debug')('bs:Clients:Reload');

export namespace ClientReloadMessage {
    export type Payload = FileEvent.Input
}

export function reloadHandler(stream: Observable<IncomingMessage>, context: IActorContext) {
    return stream
        /**
         * Group incoming messages
         */
        .buffer(stream.debounceTime(500, context.timeScheduler))
        /**
         * Take a group of messages, and determine which action to
         * send to the browser
         */
        .do(x => debug(`buffered ${x.length} items before sending to clients`))
        .flatMap((messages: IncomingMessage[]) => {
            /**
             * Construct the outgoing payload (to the browser)
             */
            const emitPayload: BrowserReload.Message = {
                name: BrowserMessages.BrowserReload,
                payload: {
                    force: true,
                    reason: BrowserReload.Reasons.FileChanged,
                    items: messages.map(incoming => incoming.message.action.payload)
                }
            };

            return context.parent.tell(SocketsMessages.Emit, emitPayload)
                .mapTo(patterns.createResponse(messages[0], 'ok!'));
        });
}
