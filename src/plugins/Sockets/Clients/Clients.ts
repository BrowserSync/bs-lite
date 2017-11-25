import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js";
import {reloadHandler} from "./Reload.message";
const debug = require('debug')('bs:Clients');

const {empty} = Observable;

export enum ClientMessages {
    Reload = 'Reload',
}

const handlers = {
    [ClientMessages.Reload]: reloadHandler,
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
                    debug(`Handler not implemented for ${obs.key}`);
                    return empty();
                })
        }
    }
}
