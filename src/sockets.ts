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

export enum SocketsMessages {
    Init = 'Detect',
    State = 'State',
}

export function Sockets(address, context) {
    return {
        initialState: {
            io: null,
            clients: null,
        },
        methods: {
            [SocketsMessages.State]: function(stream: IMethodStream<SocketsInitPayload, SocketsState, SocketsState>) {
                return stream.switchMap(({payload, respond, state}) => {
                    return Observable.of(respond(state, state));
                });
            },
            [SocketsMessages.Init]: function(stream: IMethodStream<SocketsInitPayload, string, SocketsState>) {

                return stream.switchMap(({payload, respond, state}) => {

                    const {server} = payload;

                    const options: BsSocketOptions = payload.options;

                    const io      = socket(server, options.socketIoOptions);
                    const clients = io.of(options.namespace);

                    const nextState = {
                        io,
                        clients
                    };

                    clients.on("connection", function(socket) {
                        socket.emit('connection', {greeting: 'Hi from Browsersync!'});
                    });

                    return Observable.of(respond('all done!', nextState));
                });
            }
        }
    }
}