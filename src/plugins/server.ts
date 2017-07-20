import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import connect = require('connect');
import http = require('http');
import {IRespondableStream} from "aktor-js/dist/patterns/mapped-methods";
import {Options} from "../index";
import {Map} from "immutable";
import {portsActorFactory} from "../ports";
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
        return Observable.create(obs => {
            server.close(() => {
                obs.next(true);
                obs.complete(true);
            })
        })
    }
    return Observable.of(true);
}

export function Server(address: string, context: IActorContext) {

    let server;

    function createServer(incoming: InitIncoming) {
        const {options} = incoming;
        const port = options.getIn(['server', 'port']);

        return getMaybePortActor(context, server, incoming.options)
            .flatMap(port => {
                return closeServer(server)
                    .flatMap(() => getServer(incoming.input.middleware, port))
                    .do(serverInstance => { server = serverInstance });
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
                            return Observable.of(respond(server));
                        })
                        .catch(err => {
                            console.error(err);
                        })
                });
            },
            stop: function(stream: IRespondableStream) {
                return stream.flatMap(({payload, respond}) => {
                    if (server && server.listening) {
                        server.close();
                    }
                    return Observable.of(respond('Done!'));
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
                return Observable.of(optionPort);
            }
        }
    }

    return context.actorOf(portsActorFactory, 'server-port')
        .ask('init', {
            port: optionPort,
            strict: options.get('strict'),
            name: 'core'
        });
}
