import {Observable} from 'rxjs';
import httpProxy = require('http-proxy');
import {checkCookies} from "./proxy-utils";
import {createItemFromObject, createItemFromString, ProxyItem, ProxyOptionsInput} from "./Options.message";
import {Middleware, MiddlewareTypes} from "../Server/Server";
import {IActorContext, IMethodStream, MessageResponse} from "aktor-js";

export namespace ProxyMiddleware {
    export type Response = [null|Error[], null|Middleware[]]
}

export function getMiddlewareHandler(context: IActorContext): any {
    return function middlewareHandler(stream: IMethodStream<any, ProxyMiddleware.Response, any>): any {
        return stream.map(({payload, respond}) => {
            return respond([null, getMiddleware(payload)]);
        })
    }
}

function getMiddleware(input: ProxyOptionsInput): Middleware[] {
    return [].concat(input).filter(Boolean)
        .map(input => {
            if (typeof input === "string") {
                return createOneMiddleware(createItemFromString(input));
            }
            return createOneMiddleware(createItemFromObject(input));
        })
        .filter(Boolean)
}

export function createOneMiddleware(proxyItem: ProxyItem): Middleware {

    const proxy = httpProxy.createProxyServer(proxyItem.options);

    proxy.on('error', function(err) {
        proxyItem.proxyErr.forEach(fn => fn(err));
    });

    if (proxyItem.cookies.stripDomain) {
        proxy.on('proxyRes', checkCookies);
    }

    if (proxyItem.proxyRes.length) {
        proxyItem.proxyRes.forEach(resFn => proxy.on('proxyRes', resFn));
    }

    proxy.on('proxyRes', (proxyRes, req, res) => {
        if (req.url.indexOf('css') > -1) {
            if (res.statusCode === 200 && proxyRes['headers']['content-type'] === 'text/css') {
                // console.log(req.url);
                // todo - move all proxies to be individual child actors
            }
        }
    });

    return {
        id: `Browsersync proxy for ${proxyItem.target}`,
        via: `Browsersync core`,
        route: '',
        type: MiddlewareTypes.proxy,
        handle: (req, res) => {
            proxy.web(req, res, {target: proxyItem.target});
        }
    }
}
