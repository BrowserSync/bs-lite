import {Observable} from 'rxjs';
import {Middleware} from "./plugins/server";
import {Set, fromJS} from "immutable";

const {of} = Observable;

export const defaultOptions = {
    cwd: process.cwd(),
    strict: true,
    serveStatic: [],
    clientJS: [],
    middleware: [],
    server: {
        port: 9000,
    },
    scheme: 'http',
    socket: {
        enabled: true,
        socketIoOptions: {
            log: false,
            pingInterval: 5000,
            path: '/browser-sync/socket.io',
        },
        socketIoClientConfig: {
            reconnectionAttempts: 50,
        },
        clientPath: '/browser-sync',
        namespace: '/browser-sync',
    },
    snippetOptions: {
        async: true,
        whitelist: [],
        blacklist: [],
        id: 'bs-snippet',
        via: 'Browsersync Core',
        predicates: [function(req) {
            const acceptHeader = req.headers['accept'];
            if (!acceptHeader) {
                return false;
            }
            return acceptHeader.indexOf('html') > -1;
        }],
        fn: function(req, res, html, options) {
            const snippet = options.get('snippet');
            return html.replace(/<body[^>]*>/i, function(match) {
                return match + snippet;
            });
        },
    },
};

export interface BsOptions {
    strict: boolean
    cwd?: string,
    middleware?: Middleware[],
    server: {
        port: number,
    },
    serveStatic: string|string[];
    clientJS: string|string[];
    socket: BsSocketOptions
}

export interface BsSocketOptions {
    enabled: boolean;
    socketIoOptions: {
        log: boolean;
        pingInterval: number;
        path: string;
    },
    socketIoClientConfig: {
        reconnectionAttempts: number;
    },
    clientPath: string;
    namespace: string;
}

export function DefaultOptions(address, context) {
    return {
        methods: {
            'merge': function (stream) {
                return stream.switchMap(({payload, respond}) => {
                    const output = fromJS(defaultOptions).mergeDeep(payload);
                    return of(respond(output));
                })
            }
        }
    }
}
