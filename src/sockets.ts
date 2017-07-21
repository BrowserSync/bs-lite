import socket = require('socket.io');
import {Observable} from 'rxjs';
import {IMethodStream, IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";
import {BsSocketOptions} from "./options";
import {Server} from "http";

export interface SocketsInitPayload {
    server: Server
    options: BsSocketOptions
}

export interface SocketsState {
    io: any
    clients: any
}


export function Sockets(address, context) {
    return {
        initialState: {
            io: null,
            clients: null,
        },
        methods: {
            'init': function(stream: IMethodStream<SocketsInitPayload, string, SocketsState>) {

                return stream.switchMap(({payload, respond, state}) => {

                    const {server} = payload;

                    const options: BsSocketOptions = payload.options;

                    const io      = socket(server, options.socketIoOptions);
                    const clients = io.of(options.namespace);

                    const nextState = {
                        io,
                        clients
                    };

                    return Observable.of(respond('all done!', nextState));
                });
            }
        }
    }
}