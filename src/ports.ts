import {Observable} from 'rxjs';
import {BSError, BSErrorLevel, BSErrorType, PortDetectError, PortNotAvailableError} from "./errors";
import {IMethodStream, MessageResponse} from "aktor-js";

const {of} = Observable;
const debug = require('debug')('bs:ports');
const portscanner = require('portscanner').findAPortNotInUse;

export enum PortDetectMessages {
    Detect = 'Detect',
}

export namespace PortDetect {
    export type Input = {
        strict: boolean
        port: number
        name: string
    }
    export type Response = [null|BSError[], null|number]
}

export function portsActorFactory(address, context): any {
    return {
        methods: {
            [PortDetectMessages.Detect]: function(stream: IMethodStream<PortDetect.Input, PortDetect.Response, any>) {
                return stream.switchMap(({payload, respond}) => {
                    const findPortActor = context.actorSelection('/system/core/findPort')[0];
                    const findPayload = {
                        start: payload.port,
                        opts: { host: 'localhost', timeout: 1000 }
                    };
                    return findPortActor.ask('findFreePort', findPayload)
                        .flatMap(function([err, port]) {
                            debug(`+ success ${port}`);
                            // generic error where port could not be detected
                            if (err) {
                                const outgoingError: PortDetectError = {
                                    type: BSErrorType.PortDetectError,
                                    level: BSErrorLevel.Fatal,
                                    errors: [{error: err}]
                                };
                                return of(respond([[outgoingError], null]));
                            }
                            // generic error where port could not be detected
                            if (payload.strict && payload.port !== port) {
                                const outgoingError: PortNotAvailableError = {
                                    type: BSErrorType.PortNotAvailable,
                                    level: BSErrorLevel.Fatal,
                                    errors: [
                                        {
                                            error: new Error('Strict Mode: Port ' + payload.port + ' not available'),
                                            meta: () => [
                                                `Error Details: You wanted to use port '${payload.port}' - but it wasn't available.`,
                                                `               This usually means some other service is already listening on that port.`
                                            ]
                                        }
                                    ]
                                };
                                return of(respond([[outgoingError], null]));
                            }

                            // Yay! this is the success case
                            return of(respond([null, port]));
                        })
                })
            }
        }
    }
}

export function FindPortFactory(address, context) {
    return {
        receive(name, payload, respond) {
            if (name === 'stop') return respond([null, 'ok']);
            portscanner(payload.start, undefined, payload.opts, function (err, port) {
                if (err) {
                    respond([err, null]);
                }
                respond([null, port]);
            });
        }
    }
}
