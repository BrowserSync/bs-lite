import {Observable} from 'rxjs';
import httpProxy = require('http-proxy');
import {checkCookies} from "../proxy-utils";
import {createItemFromObject, createItemFromString, ProxyItem, ProxyOptionsInput} from "./Options.message";
import {Middleware, MiddlewareTypes} from "../Server/Server";
import {IMethodStream} from "aktor-js/dist/patterns/mapped-methods";

export namespace ProxyMiddleware {
    export type Response = [null|Error[], null|Middleware[]]
}

export function middlewareHandler(stream: IMethodStream<any, ProxyMiddleware.Response, any>) {
    return stream.map(({payload, respond}) => {
        return respond([null, getMiddleware(payload)]);
    })
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
