import {Observable} from 'rxjs';
import {IActorContext} from "aktor-js/dist/ActorContext";
import connect = require('connect');
import http = require('http');
import https = require('https');
import {IRespondableStream, IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {Options} from "../index";
import {Map} from "immutable";
import {PortDetectPayload, PortDetectResponse, PortMessages, portsActorFactory} from "../ports";
import {Server} from "http";
import {Server as HttpsServer} from "https";
import {Sockets, SocketsInitPayload, SocketsMessages} from "../sockets";
import {Scheme} from "../options";
import {getHttpsOptions} from "./server-utils";

const debug = require('debug')('bs:server');

const {of} = Observable;

export interface MiddlewareResponse {
    mw?: Middleware[]
    options?: Map<string, any>
}

export interface Middleware {
    id?: string
    via?: string
    route: string
    handle: Function
}
export interface InitIncoming {
    middleware: Middleware[]
    options: Options
}
export interface IServerOptions {
    middleware: Middleware[]
    port: number;
}

function createNewServer(options: Options, app): Server|HttpsServer {
    const scheme = options.get('scheme');

    if (scheme === Scheme.http) {
        return http.createServer(app);
    }
    const httpsOptions = getHttpsOptions(options);
    return https.createServer(httpsOptions.toJS(), app);
}

function getNewServer(middleware: Middleware[], port: number, options: Options) {

    const app = connect();
    middleware.forEach(mw => {
        app.use(mw.route, mw.handle);
    });

    const server = createNewServer(options, app);

    server.listen(port);
    return Observable.of([server, app]);
}

function replaceMiddleware(middleware, app) {
    return Observable.create(obs => {
        app.stack = [];
        middleware.forEach(mw => {
            app.use(mw.route, mw.handle);
        });
        obs.next(app);
        obs.complete();
    });
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

export interface ServerState { 
    server: any
    app: any
    scheme: Scheme
}

export enum ServerMessages {
    Init = 'Detect',
    Listening = 'Listening',
    Stop = 'Stop',
    Address = 'Address',
}

export namespace ServerInit {
    export interface Response  {
        server: Server|null,
        errors: Error[]
    }
}

export type ServerListeningResponse = [null, boolean];

export function BrowserSyncServer(address: string, context: IActorContext) {

    return {
        postStart() {
            debug('-> postStart()');
        },
        initialState: {server: null, app: null},
        methods: {
            [ServerMessages.Address]: function(stream: IMethodStream<void, any, ServerState>) {
                return stream.map(({payload, respond, state}) => {
                    const {server} = state;
                    if (server && server.listening) {
                        return respond(server.address(), state);
                    }
                    return respond(null, state);
                });
            },
            [ServerMessages.Init]: function (stream: IMethodStream<InitIncoming, ServerInit.Response, ServerState>) {
                return stream.flatMap(({payload, respond, state}) => {
                    const {options, middleware} = payload;
                    const scheme: Scheme = options.get('scheme');

                    return getMaybePortActor(context, state.server, options)
                        .flatMap(([port, server]) => {
                            // if server is already running?
                            if (server && server.listening) {
                                // check if the port matches the desired + scheme is the same
                                if (server.address().port === port && state.scheme === scheme) {
                                    // if so, just re-apply the middleware to avoid rebinding a port
                                    return replaceMiddleware(middleware, state.app)
                                        .do(x => console.log('replacing middleware'))
                                        .map((app) => {
                                            return respond({server, errors: []}, {server, app, scheme});
                                        })
                                }   
                            }
                            // at this point, the PORT has changed so we close the server
                            return closeServer(server)
                                // Now we recreate a new server
                                .flatMap(() => getNewServer(middleware, port, options))
                                // we use that new server to add socket support
                                .flatMap(([server, app]) => {

                                    // this is the payload for the Socket actors Init message
                                    const socketPayload: SocketsInitPayload = {
                                        server,
                                        options: options.get('socket').toJS()
                                    };

                                    // create the sockets actor and send it an Init method
                                    return context.actorOf(Sockets, 'sockets')
                                        .ask(SocketsMessages.Init, socketPayload)
                                        .mapTo([server, app]);
                                })
                                .map(([server, app]) => {
                                    return respond({server, errors: []}, {server, app, scheme});
                                })
                        })
                        .catch(err => {
                            return of(respond({server: null, errors: [err]}, state));
                        });
                });
            },
            [ServerMessages.Stop]: function(stream: IMethodStream<InitIncoming, string, ServerState>) {
                return stream.flatMap(({payload, respond, state}) => {
                    const {server} = state;
                    if (server && server.listening) {
                        server.close();
                    }
                    return Observable.of(respond('Done!', {server: null, app: null, scheme: null}));
                })
            },
            [ServerMessages.Listening]: function(stream) {
                return stream.flatMap(({state, respond}) => {
                    if (state.server) {
                        return Observable.of(respond(<ServerListeningResponse>[null, state.server.listening], state));
                    }
                    return Observable.of(respond(<ServerListeningResponse>[null, false], state));
                });
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

    const portActor = context.actorOf(portsActorFactory);
    const payload: PortDetectPayload = {
        port: optionPort,
        strict: options.get('strict'),
        name: 'core'
    };

    return portActor
        .ask(PortMessages.Detect, payload)
        .flatMap((resp: PortDetectResponse) => {
            if (resp.errors.length) {
                return Observable.throw(resp.errors[0]);
            }
            return of(([resp.port, server]))
        });
}
