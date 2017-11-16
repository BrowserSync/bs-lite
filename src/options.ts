import {Observable} from 'rxjs';
import {Middleware} from "./plugins/Server/server";
import {Set, fromJS} from "immutable";
import {RewriteRule} from "./rewrite-rules";
import {clientScript, scriptTags} from "./connect-utils";
import {doesNotContainDisableParam, headerHasHtmlAccept} from "./utils";
import {ProxyOptionsInput} from "./plugins/Proxy/Options.message";

const {of} = Observable;

export enum DefaultOptionsMethods {
    Merge = 'Merge'
}

export enum Scheme {
    http = 'http',
    https = 'https',
}

export const defaultOptions: BsOptions = {
    cwd: process.cwd(),
    strict: true,
    serveStatic: [],
    clientJS: [],
    compression: true,
    middleware: [],
    rewriteRules: [],
    snippet: '',
    server: {
        port: 9000,
    },
    scheme: Scheme.http,
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
        rewriteRule: {
            // whitelist: [],
            // blacklist: [],
            id: 'bs-snippet',
            via: 'Browsersync Core',
            predicates: [
                headerHasHtmlAccept,
                doesNotContainDisableParam
            ],
            fn: function(req, res, html, options) {
                const snippet = options.get('snippet');
                return html.replace(/<body[^>]*>/i, function(match) {
                    return match + snippet;
                });
            },
        },
        async: true,
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
    socket: BsSocketOptions;
    snippetOptions: {
        async: boolean
        rewriteRule: RewriteRule
    };
    rewriteRules: RewriteRule[];
    snippet: string;
    scheme: Scheme;
    compression: boolean;
    proxy?: ProxyOptionsInput;
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
            [DefaultOptionsMethods.Merge]: function (stream) {
                return stream.switchMap(({payload, respond}) => {
                    const output = fromJS(defaultOptions).mergeDeep(payload);
                    return of(respond(output));
                })
            }
        }
    }
}

/**
 * @param options
 * @returns {Cursor|List<T>|Map<K, V>|Map<string, V>|*}
 */
export function addMissingOptions(options) {
    return options.mergeDeep({
        snippet:     scriptTags(options),
        scriptPath:  clientScript(options),
        sessionId:   new Date().getTime(),
    });
}
