import {Observable} from 'rxjs';
import {getMaxListeners} from "cluster";
import {System} from "aktor-js/dist/System";
import {SocketsMessages} from "../Sockets";
import {BrowserMessages, BrowserReload} from "./Messages";
import {IActorContext} from "aktor-js/dist/ActorContext";
import {patterns} from "aktor-js";

const { empty } = Observable;

export enum ClientMessages {
    Reload = 'Reload',
}

export function ClientsFactory(address: string, context: IActorContext) {
    return {
        setupReceive(incoming) {
            return incoming
                .groupBy(x => x.message.type)
                .flatMap((obs) => {
                    return obs
                        // .pluck('message', 'action')
                        .buffer(obs.debounceTime(500))
                        .flatMap((mess) => {

                            const emitPayload: BrowserReload.Message = {
                                name: BrowserMessages.BrowserReload,
                                payload: { force: true }
                            };
                            return context.parent.tell(SocketsMessages.Emit, emitPayload)
                                .mapTo(patterns.createResponse(mess[0], 'ok!'));
                        });
                })
        }
    }
}