import {Middleware, MiddlewareResponse} from "./server";
import httpProxy = require('http-proxy');
import {ServerOptions} from 'http-proxy';
import NodeURL  = require('url');
import * as http from "http";
import ErrorCallback = require("http-proxy");
import {parse} from "url";

const defaultHttpProxyOptions: ServerOptions = {
    changeOrigin: true,
    autoRewrite: true,
    secure: false,
    ws: true,
};

export type ProxyOptionsInput = string|ProxyOption;

export interface CookieOptions {
    stripDomain: boolean;
}

export interface ProxyOption {
    options?: ServerOptions;
    route?: string;
    target?: string;
    url?: NodeURL.Url;
    cookies?: CookieOptions
    proxyReq?: ProxyReqFn[]
    proxyRes?: ProxyResFn[]
    proxyErr?: ErrorCallback[]
}

export type ProxyReqFn = (proxyReq: http.ClientRequest,
                          req: http.IncomingMessage,
                          res: http.ServerResponse,
                          options: ServerOptions) => void;

export type ProxyResFn = (proxyRes: http.IncomingMessage,
                          req: http.IncomingMessage,
                          res: http.ServerResponse) => void;

export function createItemFromString(input: string): ProxyOption {
    const url = parse(input);
    const target = [url.protocol, '//', url.host].join('');
    return createItem({url, target});
}

export function createItem(incoming: ProxyOption): ProxyOption {
    return {
        ...incoming,
        proxyReq: [].concat(incoming.proxyReq).filter(Boolean),
        proxyRes: [].concat(incoming.proxyRes).filter(Boolean),
        proxyErr: [].concat(incoming.proxyErr).filter(Boolean),
        options: {
            ...defaultHttpProxyOptions,
            ...incoming.options,
        }
    }
}

export function createFromString(input: string): Middleware {
    const opts = createItemFromString(input);
    const proxy = httpProxy.createProxyServer(opts);

    return {
        id: `Browsersync proxy for ${input}`,
        via: `Browsersync core`,
        route: '',
        handle: (req, res) => {
            proxy.web(req, res, {target: opts.target});
        }
    }
}

function getMiddleware(input: ProxyOptionsInput): Middleware[] {
    return [].concat(input).filter(Boolean)
        .map(input => {
            if (typeof input === "string") {
                return createFromString(input);
            }
            // return createFromObject(input);
            return input;
        })
}

export function BrowsersyncProxy(address, context) {
    return {
        receive(name, options, respond: (resp: MiddlewareResponse) => void) {
            const option = options.get('proxy');
            if (typeof option === 'string') {
                respond({
                    mw: getMiddleware(option)
                });
            }
        }
    }
}
