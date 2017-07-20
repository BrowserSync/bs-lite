import socket = require('socket.io');
import {Observable} from 'rxjs';
import {IMethodStream, IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";
import {BsSocketOptions} from "./options";
import {Server} from "http";

export interface SocketsInitPayload {
    server: Server
    options: BsSocketOptions
}


export function Sockets(address, context) {
    const state = {
        io: null,
        clients: null,
    };
    return {
        methods: {
            'init': function(stream: IMethodStream<SocketsInitPayload, string>) {

                return stream.switchMap(({payload, respond}) => {

                    const {server} = payload;

                    const options: BsSocketOptions = payload.options;

                    state.io      = socket(server, options.socketIoOptions);
                    state.clients = state.io.of(options.namespace);

                    return Observable.of(respond('all done!'));
                });
            }
        }
    }
}