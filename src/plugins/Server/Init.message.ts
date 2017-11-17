import {Observable} from 'rxjs';
import {Middleware, ServerState} from "./Server";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";

import {Server} from "http";
import {Server as HttpsServer} from "https";
import {Options} from "../../index";
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Scheme} from "../../options";
import {PortDetect, PortDetectMessages, portsActorFactory} from "../../ports";

import connect = require('connect');
import http = require('http');
import https = require('https');
import {Sockets, SocketsInitPayload, SocketsMessages} from "../../sockets";
import {getHttpsOptions} from "./server-utils";

const { of } = Observable;

export namespace ServerInit {
    export type Response = [null|Error[], Server|null]
    export type Input = {
        middleware: Middleware[]
        options: Options
    }
}

export function serverInitHandler(context: IActorContext) {
    return function(stream: IMethodStream<ServerInit.Input, ServerInit.Response, ServerState>) {

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
                                    return respond([null, server], {server, app, scheme});
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
                            return respond([null, server], {server, app, scheme});
                        })
                })
                .catch(err => {
                    return of(respond([[err], null], state));
                });
        });
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
    const payload: PortDetect.Input = {
        port: optionPort,
        strict: options.get('strict'),
        name: 'core'
    };

    return portActor
        .ask(PortDetectMessages.Detect, payload)
        .flatMap((resp: PortDetect.Response) => {
            const [errors, port] = resp;
            if (errors && errors.length) {
                return Observable.throw(errors[0]);
            }
            return of(([port, server]))
        });
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
