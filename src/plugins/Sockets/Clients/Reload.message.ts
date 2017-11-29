import {Observable} from 'rxjs';
import {FileEvent} from "../../Watcher/FileEvent.message";
import {IActorContext, IncomingMessage, patterns} from "aktor-js";
import {AssetReload, BrowserMessages, BrowserReload} from "./BrowserMessageTypes";
import {SocketsMessages} from "../Sockets";
import {Set} from 'immutable';
const debug = require('debug')('bs:Clients:Reload');

export namespace ClientReloadMessage {
    export type Payload = FileEvent.Input
}

export function reloadHandler(stream: Observable<IncomingMessage>, context: any) {
    return stream
        /**
         * Group incoming messages into 500ms chunks
         */
        .buffer(stream.debounceTime(500, context.timeScheduler))
        /**
         * Take a group of messages, and determine which action to
         * send to the browser
         */
        .do(x => debug(`buffered ${x.length} items before sending to clients`))
        .flatMap((messages: IncomingMessage[]) => {
            const injectTypes = Set(['.css']);
            const items = messages.map(incoming => incoming.message.action.payload);
            const injects = items.filter((item: FileEvent.Input) => injectTypes.contains(item.parsed.ext));
            const reloads = items.filter((item: FileEvent.Input) => !injectTypes.contains(item.parsed.ext));

            if (reloads.length) {
                /**
                 * Construct the outgoing payload (to the browser)
                 */
                const emitPayload = BrowserReload.create({
                    reason: BrowserReload.Reasons.FileChanged,
                    items: [reloads[0]], // only send the first item
                });

                return context.parent.tell(SocketsMessages.Emit, emitPayload)
                    .mapTo(patterns.createResponse(messages[0], 'ok!'));
            }

            if (injects.length) {
                /**
                 * Construct the outgoing payload (to the browser)
                 */
                const emitPayload = AssetReload.create({
                    reason: BrowserReload.Reasons.FileChanged,
                    items: injects, // send all injectable items
                });

                return context.parent.tell(SocketsMessages.Emit, emitPayload)
                    .mapTo(patterns.createResponse(messages[0], 'ok!'));
            }
        });
}
