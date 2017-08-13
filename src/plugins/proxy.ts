import {Observable} from 'rxjs/Observable';
import {Middleware, MiddlewareResponse} from "./server";
import httpProxy = require('http-proxy');
import {ServerOptions} from 'http-proxy';
import NodeURL  = require('url');
import * as http from "http";
import ErrorCallback = require("http-proxy");
import {parse} from "url";
import {checkCookies, proxyRewriteLinks} from "./proxy-utils";
import {fromJS, List} from "immutable";
import {GetActorFn} from "../Browsersync.init";

const defaultHttpProxyOptions: ServerOptions = {
    changeOrigin: true,
    autoRewrite: true,
    secure: false,
    ws: true,
};

export type ProxyOptionsInput = string|ProxyItem;

export interface CookieOptions {
    stripDomain: boolean;
}

const defaultCookieOptions: CookieOptions = {
    stripDomain: true
};

export interface ProxyItem {
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

export function createItemFromString(input: string): ProxyItem {
    const url = parse(input);
    const target = [url.protocol, '//', url.host].join('');
    return createItem({url, target});
}

export function createItem(incoming: ProxyItem): ProxyItem {
    return {
        ...incoming,
        proxyReq: [].concat(incoming.proxyReq).filter(Boolean),
        proxyRes: [].concat(incoming.proxyRes).filter(Boolean),
        proxyErr: [].concat(incoming.proxyErr).filter(Boolean),
        options: {
            ...defaultHttpProxyOptions,
            ...incoming.options,
        },
        cookies: {
            ...defaultCookieOptions,
            ...incoming.cookies
        }
    }
}

export function createOneMiddleware(proxyItem: ProxyItem): Middleware {

    const proxy = httpProxy.createProxyServer(proxyItem.options);

    if (proxyItem.cookies.stripDomain) {
        proxy.on('proxyRes', checkCookies);
    }

    return {
        id: `Browsersync proxy for ${proxyItem.target}`,
        via: `Browsersync core`,
        route: '',
        handle: (req, res) => {
            proxy.web(req, res, {target: proxyItem.target});
        }
    }
}

function getMiddleware(input: ProxyOptionsInput): Middleware[] {
    return [].concat(input).filter(Boolean)
        .map(input => {
            if (typeof input === "string") {
                return createOneMiddleware(createItemFromString(input));
            }
            // return createFromObject(input);
            return input;
        })
}

export function BrowsersyncProxy(address, context) {
    return {
        receive(name, option, respond) {
            if (name === 'options') {
                const items = option.map(option => {
                    const item = createItemFromString(option);
                    return proxyRewriteLinks(item.url);
                });
                respond({
                    rewriteRules: items
                });
                return;
            }
            if (name === 'middleware') {
                respond(getMiddleware(option));
            }
        }
    }
}

export function getProxyOption(input: any): ProxyOptionsInput[] {
    return List([]).concat(input).toJS().filter(Boolean);
}

export function askForProxyMiddleware (getActor: GetActorFn, proxyOption: ProxyOptionsInput[]) {
    if (proxyOption.length) {
        return getActor('proxy', BrowsersyncProxy)
            .ask('middleware', proxyOption)
    }
    return Observable.of([]);
}

export function askForProxyOptions(getActor: GetActorFn, proxyOption: ProxyOptionsInput[]) {
    if (proxyOption.length) {
        return getActor('proxy', BrowsersyncProxy)
            .ask('options', proxyOption)
    }
    return Observable.empty();
}
