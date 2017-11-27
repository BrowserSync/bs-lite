import {Observable} from 'rxjs';
import {Server} from "http";
import {initHandler} from "./Init.message";
import {stateHandler} from "./State.message";
import {ClientsFactory} from "./Clients/Clients";
import {MessageResponse, IMethodStream} from "aktor-js";

const { of } = Observable;

export interface SocketsState {
    io: any
    clients: any
}

export enum SocketsMessages {
    Init = 'Detect',
    Emit = 'Emit',
    State = 'State',
}

export function Sockets(address, context): any {
    return {
        initialState: {
            io: null,
            clients: null,
        },
        postStart() {
            context.actorOf(ClientsFactory, 'clients')
        },
        methods: {
            [SocketsMessages.State]: stateHandler,
            [SocketsMessages.Init]: initHandler,
            [SocketsMessages.Emit]: function(stream: IMethodStream<{name: string, payload: any}, [null, string], SocketsState>) {
                return stream.switchMap(({state, payload, respond}) => {
                    const clients = state.io.of('/browser-sync');
                    clients.emit(payload.name, payload.payload);
                    return of(respond([null, 'sent!'], state));
                })
            },
        }
    }
}
