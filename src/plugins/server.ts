import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import connect = require('connect');
import http = require('http');
import {IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";
import {Options} from "../index";
import {Map} from "immutable";
import {portsActorFactory} from "../ports";
const debug = require('debug')('bs:server');

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
        if (server) {
            if (server.listening) {
                const port = server.address().port;
                // if the server is already running and
                // listening on the selected port, there's nothing more to do.
                if (port === incoming.options.getIn(['server', 'port'])) {
                    return Observable.of(server);
                }
            }
        }

        const {options} = incoming;
        const port = options.getIn(['server', 'port']);
        const portActor = context.actorOf(portsActorFactory, 'server-port');

        return portActor
            .ask('init', {port, strict: true, name: 'core'})
            .flatMap(port => {

                const app = connect();

                incoming.input.middleware.forEach(mw => {
                    app.use(mw.route, mw.handle);
                });

                server = http.createServer(app);
                server.listen(port);

                // stop port actor and return server
                return context.gracefulStop(portActor)
                    .mapTo(server);
            })
            .catch(err => {
                console.error(err);
                return Observable.empty();
            })
    }

    return {
        postStart() {
            debug('-> postStart()');
        },
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
                    return createServer(payload)
                        .flatMap(server => {
                            return Observable.of(respond(server.address()));
                        })
                        .catch(err => {
                            console.error(err);
                        })
                });
            },
        },
    }
}
