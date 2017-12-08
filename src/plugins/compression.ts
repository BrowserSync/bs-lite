import {Middleware, MiddlewareTypes} from "./Server/Server";
import {BSError} from "../errors";
const debug = require('debug')('bs:compression');

export enum CompressionMessages {
    Middleware = 'middleware',
}

export namespace CompressionMiddleware {
    export type Input = boolean;
    export type Response = [null|BSError[], null|Middleware[]];
    export function create(input: Input): [CompressionMessages.Middleware, Input] {
        return [CompressionMessages.Middleware, input];
    }
}

export default function Compression() {
    return {
        postStart() {
            debug('-> postStart()');
        },
        receive(name, payload, respond) {
            switch (name) {
                case CompressionMessages.Middleware: {
                    const mw : Middleware = {
                        id: 'Compression',
                        via: 'Compression',
                        route: '',
                        type: MiddlewareTypes.other,
                        handle: require('compression')()
                    };
                    return respond(mw);
                }
                default: {
                    respond(':)');
                }
            }
        }
    }
}
