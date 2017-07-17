import {Middleware} from "./plugins/server";
export const defaultOptions = {
    strict: true,
    clientJS: [],
    middleware: [],
    server: {
        port: 9000,
    },
    scheme: 'http',
    socket: {
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
}
