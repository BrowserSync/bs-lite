import {Observable} from 'rxjs';
import {getMaxListeners} from "cluster";
import {System} from "aktor-js/dist/System";

const { empty } = Observable;

export enum ClientMessages {
    Reload = 'Reload',
}

export function ClientsFactory() {
    return {
        setupReceive(incoming) {
            return incoming
                .groupBy(x => x.message.type)
                .flatMap((obs) => {
                    return obs
                        .buffer(obs.debounceTime(1000))
                        .flatMap((mess) => {
                            // console.log(mess.le);
                            console.log(mess.length);
                            return empty();
                        })
                })
        }
    }
}