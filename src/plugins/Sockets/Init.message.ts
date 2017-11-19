import {Observable} from 'rxjs';
import socket = require('socket.io');
import {Server} from "http";
import {SocketsState} from "./Sockets";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {BsSocketOptions} from "../../options";


export namespace SocketsInit {
    export type Input = {
        server: Server,
        options: BsSocketOptions,
    }
    export type Response = [null, string];
}

export function initHandler(stream: IMethodStream<SocketsInit.Input, SocketsInit.Response, SocketsState>) {

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