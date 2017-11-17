'use strict';

import {Observable} from 'rxjs/Observable';
import {Options} from "./index";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {BSError, BSErrorLevel, BSErrorType, PortDetectError, PortNotAvailableError} from "./errors";
import {ActorRef} from "aktor-js/dist/ActorRef";

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

export function portsActorFactory(address, context) {
    return {
        methods: {
            [PortDetectMessages.Detect]: function(stream: IMethodStream<PortDetect.Input, PortDetect.Response, any>) {
                return stream.switchMap(({payload, respond}) => {
                    const findPortActor = portActor(context);
                    const findPayload = {
                        start: payload.port,
                        end: undefined,
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

function portActor(context): ActorRef {
    const match = context.actorSelection('/system/findPort');

    if (match.length > 0) {
        return match[0];
    }

    return context.actorOf(actorWrap(findPort));
}

export function actorWrap(fn) {
    return function(address, context) {
        return {
            receive(name, payload, respond) {
                fn(payload).take(1).subscribe((res) => {
                    respond(res);
                });
            }
        }
    }
}

function findPort({start, end, opts}) {
    return Observable.create(obs => {
        portscanner(start, undefined, opts, function (err, port) {
            if (err) {
                obs.next([err, null]);
            }
            obs.next([null, port]);
        });
    }).take(1);
}
