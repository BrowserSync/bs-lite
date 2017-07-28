'use strict';

import {Observable} from 'rxjs/Observable';
import {Options} from "./index";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
const {of, zip} = Observable;
const debug = require('debug')('bs:ports');
const portscanner = require('portscanner').findAPortNotInUse;

function findPort(start, strict, opts) {
    return Observable.create(obs => {
        portscanner(start, strict, opts, function (err, port) {
            if (err) {
                return obs.error(err);
            }
            obs.next(port);
            obs.complete();
        });
    });
}

export function getPort(start, strict, name) {

    debug(`> trying  ${start} for ${name}`);

    return findPort(start, undefined, {host: 'localhost', timeout: 1000})

        .flatMap(function(port) {

            debug(`+ success ${port} for ${name}`);

            if (strict && start !== port) {
                return Observable.throw('Strict Mode: Port ' + start + ' not available');
            }

            return of(port);
        });
}

export enum PortMessages {
    Detect = 'Detect',
    Stop = 'Stop',
}

export interface PortDetectResponse {
    errors: Error[],
    port: number|null
}
export interface PortDetectPayload {
    strict: boolean
    port: number
    name: string
}

export function portsActorFactory(address, context) {
    return {
        methods: {
            [PortMessages.Detect]: function(stream: IMethodStream<PortDetectPayload, PortDetectResponse, any>) {
                return stream.switchMap(({payload, respond}) => {
                    return getPort(payload.port, payload.strict, payload.name)
                        .map(port => respond({port, errors: []}))
                        .catch(err => {
                            return Observable.of(respond({errors: [err], port: null}))
                        });
                })
            },
            stop: function(stream) {
                return stream.switchMap(({payload, respond}) => {
                    return Observable.of(respond('done!'));
                });
            }
        }
    }
}
