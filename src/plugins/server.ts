import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import connect = require('connect');
import http = require('http');
import {IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";
import {Options} from "../index";
import {Map} from "immutable";

export interface MiddlewareResponse {
    mw?: Middleware[]
    options?: Map<string, any>
}

export interface Middleware {
    id?: string
    route: string
    handle: Function
}
export interface InitIncoming {
    input: {
        middleware: Middleware[]
    }
    options: Options
}
export interface IServerOptions {
    middleware: Middleware[]
    port: number;
}

export default function Server(address: string, context: IActorContext) {

    let server;

    function createServer(incoming: InitIncoming) {
        if (server) server.close();
        const {options} = incoming;
        const port = options.getIn(['server', 'port']);
        const app = connect();
        // console.log('applying', middleware.length, 'middleware items');
        incoming.input.middleware.forEach(mw => {
            app.use(mw.route, mw.handle);
        });
        server = http.createServer(app);
        server.listen(port);
        return server;
    }

    return {
        methods: {
            address: function(stream: IRespondableStream) {
                return stream.flatMap(({payload, respond}) => {
                    if (server && server.listening) {
                        return Observable.of(respond(server.address()));
                    }
                    return Observable.of(respond(null));
                });
            },
            init: function (stream: IRespondableStream) {
                return stream.flatMap(({payload, respond}) => {
                    const s = createServer(payload);
                    return Observable.of(respond(s.address()));
                });
            },
        },
    }
}
