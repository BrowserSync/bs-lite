import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";

import connect = require('connect');
import http = require('http');
import {IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";

export interface MiddlewareResponse {
    mw?: Middleware[]
}

export interface Middleware {
    id?: string
    route: string
    handle: Function
}

export interface IServerOptions {
    middleware: Middleware[]
    port: number;
}

export default function Server(address: string, context: IActorContext) {

    let server;
    function createServer(options: IServerOptions) {
        if (server) server.close();
        const {port, middleware} = options;
        const app = connect();
        // console.log('applying', middleware.length, 'middleware items');
        middleware.forEach(mw => {
            app.use(mw.route, mw.handle);
        });
        server = http.createServer(app);
        server.listen(port);
        return server;
    }

    return {
        methods: {
            init: function (stream: IRespondableStream) {
                return stream.flatMap(({payload, respond}) => {
                    const s = createServer(payload);
                    return Observable.of(respond(s.address()));
                })
            },
        },
        patterns: ['reduxObservable']
    }
}
