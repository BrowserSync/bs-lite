import {Observable} from 'rxjs';
import socket = require('socket.io');
import {Server} from "http";
import {SocketsState} from "./Sockets";
import {IMethodStream, MessageResponse} from "aktor-js";
import {BsSocketOptions} from "../../options";

export namespace SocketsInit {
    export type Input = {
        server: Server,
        options: BsSocketOptions,
    }
    export type Response = [null, string];
}

export function initHandler(stream: IMethodStream<SocketsInit.Input, SocketsInit.Response, SocketsState>): any {

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

        return Observable.of(respond([null, 'ok'], nextState));
    });
}
