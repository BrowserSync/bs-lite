'use strict';

import {Observable} from 'rxjs/Observable';
import {Options} from "./index";
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

        .flatMap(function(x) {

            debug(`+ success ${x} for ${name}`);

            if (strict && start !== x) {
                return Observable.throw('Strict Mode: Port ' + start + ' not available');
            }

            return of(x);
        });
}

export function getPorts(options: Options) {

    const strict = options.get('strict');
    const port1 = options.getIn(['server', 'port']);

    return getPort(port1, strict, 'core')

        .flatMap(function(defaultPort) {

            const def = of(defaultPort);

            if (!options.getIn(['proxy', 'ws'])) {

                debug(`no WS, using single port/server at ${defaultPort}`);

                return def.map(function(x) {
                    return {
                        server: {port: x},
                        shane: "Kittie"
                    };
                });
            }

            return zip(def, getPort(options.getIn(['socket', 'port']) || defaultPort + 1, strict, 'socket'), function(first, second) {
                return {
                    server: {port: first},
                    socket: {
                        port: second,
                    },
                };
            });
        });
}

export function portsActorFactory(address, context) {
    return {
        methods: {
            init: function(stream) {
                return stream.switchMap(({payload, respond}) => {
                    return getPort(payload.port, payload.strict, payload.name)
                        .map(respond)
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
