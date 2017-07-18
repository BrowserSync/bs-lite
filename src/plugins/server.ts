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

export function Server(address: string, context: IActorContext) {

    let server;

    function createServer(incoming: InitIncoming) {
        const {options} = incoming;
        const port = options.getIn(['server', 'port']);

        return getMaybePortActor(context, server, incoming.options)
            .flatMap(port => {

                // todo, can we be less brutal here, and perhaps
                // just replace the app.stack?
                if (server && server.listening) {
                    server.close();
                }

                const app = connect();

                incoming.input.middleware.forEach(mw => {
                    app.use(mw.route, mw.handle);
                });

                server = http.createServer(app);
                server.listen(port);

                // stop port actor and return server
                return of(server);
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
