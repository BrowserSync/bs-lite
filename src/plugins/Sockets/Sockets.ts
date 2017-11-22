import {Observable} from 'rxjs';
import {BsSocketOptions} from "../../options";
import {Server} from "http";
import {initHandler} from "./Init.message";
import {stateHandler} from "./State.message";
import {ClientsFactory} from "./Clients/Clients";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";

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

export function Sockets(address, context) {
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
                    if (state.clients) {
                        const clients = state.io.of('/browser-sync');
                        clients.emit(payload.name, payload.payload);
                    }
                    return of(respond([null, 'sent!'], state));
                })
            },
        }
    }
}