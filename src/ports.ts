'use strict';

import {Observable} from 'rxjs/Observable';
import {Options} from "./index";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";
import {BSError} from "./errors";
const {of, zip} = Observable;
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
                    return getPort(payload.port, payload.strict, payload.name)
                        .map(port => respond([null, port]))
                        .catch(err => {
                            return Observable.of(respond([err, null]))
                        });
                })
            }
        }
    }
}

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
