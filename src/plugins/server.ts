import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import connect = require('connect');
import http = require('http');
import {IRespondableStream, IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {Options} from "../index";
import {Map} from "immutable";
import {portsActorFactory} from "../ports";
import {Server} from "http";

const debug = require('debug')('bs:server');

const {of} = Observable;

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

function getServer(middleware, port) {
    const app = connect();

    middleware.forEach(mw => {
        app.use(mw.route, mw.handle);
    });

    const server = http.createServer(app);
    server.listen(port);
    return Observable.of(server);
}

function closeServer(server) {
    if (server && server.listening) {    
        const closer = Observable.create(obs => {
            server.close(() => {
                obs.next(true);
                obs.complete(true);
            })
        });
        return Observable.merge(closer, Observable.timer(1000)).take(1);
    }
    return Observable.of(true);
}

export function Server(address: string, context: IActorContext) {

    function createServer(incoming: InitIncoming, server) {
        const {options} = incoming;
        const port = options.getIn(['server', 'port']);

        return getMaybePortActor(context, server, incoming.options)
            .flatMap(([port, server]) => {
                return closeServer(server)
                    .flatMap(() => getServer(incoming.input.middleware, port));
            })
            .catch(err => {
                return Observable.empty();
            })
    }

    return {
        postStart() {
            debug('-> postStart()');
        },
        initialState: null,
        methods: {
            address: function(stream: IMethodStream<void, any, Server>) {
                return stream.flatMap(({payload, respond, state}) => {
                    const server = state;
                    if (server && server.listening) {
                        return Observable.of(respond(server.address(), state));
                    }
                    return Observable.of(respond(null, state));
                });
            },
            init: function (stream: IMethodStream<InitIncoming, Server, Server>) {
                return stream.flatMap(({payload, respond, state}) => {
                    return createServer(payload, state)
                        .flatMap(server => {
                            return Observable.of(respond(server, server));
                        })
                        .catch(err => {
                            console.error(err);
                        })
                });
            },
            stop: function(stream: IMethodStream<InitIncoming, string, Server>) {
                return stream.flatMap(({payload, respond, state}) => {
                    const server = state;
                    if (server && server.listening) {
                        server.close();
                    }
                    return Observable.of(respond('Done!', null));
                })
            }
        },
    }
}

function getMaybePortActor(context, server, options) {
    const optionPort = options.getIn(['server', 'port']);
    if (server) {
        if (server.listening) {
            const serverPort = server.address().port;
            // if the server is already running and
            // listening on the selected port, there's nothing more to do.
            if (serverPort === optionPort) {
                return Observable.of([optionPort, server]);
            }
        }
    }

    return context.actorOf(portsActorFactory, 'server-port')
        .ask('init', {
            port: optionPort,
            strict: options.get('strict'),
            name: 'core'
        })
        .map(port => ([port, server]));
}
