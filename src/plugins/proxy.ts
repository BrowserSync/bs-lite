import {Middleware, MiddlewareResponse} from "./server";
import httpProxy = require('http-proxy');

export interface HttpProxyOptions {
    changeOrigin: boolean;
    autoRewrite: boolean;
    secure: boolean;
    ws: boolean;
}

const defaultHttpProxyOptions: HttpProxyOptions = {
    changeOrigin: true,
    autoRewrite: true,
    secure: false,
    ws: true,
};

export type ProxyOptionsInput = string|ProxyOption;

export interface ProxyOption {
    route?: string
    target: string;
}

function createFromString(input: string): Middleware {
    const target = input;
    const proxy = httpProxy.createProxyServer({
        ...defaultHttpProxyOptions,
        target
    });
    return {
        id: `Browsersync proxy for ${target}`,
        via: `Browsersync core`,
        route: '',
        handle: (req, res) => {
            proxy.web(req, res, {target});
        }
    }
}

// function createFromObject(input: ProxyOption): Middleware {
//     return
// }

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
            if (typeof options.get('proxy') === 'string') {
                respond({
                    mw: getMiddleware(options.get('proxy'))
                })
            }
        }
    }
}
