import {Observable} from 'rxjs';
import * as HttpProxy from 'http-proxy';
import NodeURL  = require('url');
import * as http from "http";
import {parse} from "url";
import {IMethodStream, MessageResponse} from "aktor-js";
import {proxyRewriteLinks} from "./proxy-utils";
import {isPojo} from "../../utils";
import {RewriteRule} from "../../rewrite-rules";
import {Scheme} from "../../options";
import {BSError, BSErrorLevel, BSErrorType, ProxyInvalidInputError} from "../../errors";

const {of} = Observable;

export namespace ProxyOptions {
    export type Response = [null|BSError[], null|{
        rewriteRules: RewriteRule[],
        scheme: Scheme
    }]
}

/**
 * Add missing option from @types
 */
declare module 'http-proxy' {
    interface ServerOptions {
        cookieDomainRewrite?: boolean | string;
    }
}

const defaultHttpProxyOptions: HttpProxy.ServerOptions = {
    changeOrigin: true,
    autoRewrite: true,
    secure: false,
    ws: true,
    cookieDomainRewrite: '',
};

export type ProxyOptionsInput = (string|ProxyItem)|Array<string|ProxyItem>;

export interface ProxyItem {
    options?: HttpProxy.ServerOptions;
    route?: string;
    target?: string;
    url?: NodeURL.Url;
    proxyReq?: ProxyReqFn[]
    proxyRes?: ProxyResFn[]
    proxyErr?: ProxyErrFn[]
}

export type ProxyReqFn = (proxyReq: http.ClientRequest,
                          req: http.IncomingMessage,
                          res: http.ServerResponse,
                          options: HttpProxy.ServerOptions) => void;

export type ProxyResFn = (proxyRes: http.IncomingMessage,
                          req: http.IncomingMessage,
                          res: http.ServerResponse) => void;

export type ProxyErrFn = (error: Error) => void;
export type ProxyResult = {errors: BSError[], item?: ProxyItem };

export function optionsHandler(stream$: IMethodStream<any, ProxyOptions.Response, any>): any {
    return stream$.flatMap(({payload, respond}) => {
        const proxyItems = payload.map((option): ProxyResult => {
            if (typeof option === 'string') {
                return {
                    errors: [],
                    item: createItemFromString(option)
                }
            } else {
                if (isPojo(option) && typeof option.target === 'string') {
                    return {
                        errors: [],
                        item: createItemFromObject(option)
                    }
                }
                const error: ProxyInvalidInputError = {
                    type: BSErrorType.ProxyInvalidInput,
                    level: BSErrorLevel.Fatal,
                    errors: [{
                        error: new Error('Incoming proxy option must contain at least a `target` property'),
                        meta: () => {
                            return [
                                `   Your Input: ${option}`,
                                `     Examples: 'http://example.com' or 'https://example.com'`
                            ];
                        }
                    }]
                };
                return {
                    errors: [error],
                    item: option,
                }
            }
        });

        const withErrors = proxyItems.filter(x => x.errors.length !== 0);
        const errors = withErrors.reduce((acc, item) => acc.concat(item.errors), []);
        const withoutErrors = proxyItems.filter(x => x.errors.length === 0);

        const hasHttps = withoutErrors
            .filter(Boolean)
            .some((x: ProxyResult) => x.item.url.protocol === 'https:');

        const items = withoutErrors
            .filter(Boolean)
            .map((x: ProxyResult) => proxyRewriteLinks(x.item.url));

        if (errors.length) {
            return of(respond([errors, null]))
        }

        return of(respond([null, {
            rewriteRules: items,
            scheme: hasHttps ? Scheme.https : Scheme.http,
        }]));
    })
}

export function createItemFromString(input: string): ProxyItem {
    const url = parse(input);
    const target = [url.protocol, '//', url.host].join('');
    return createItem({url, target});
}

export function createItemFromObject(incoming: ProxyItem): ProxyItem {
    const url = parse(incoming.target);
    const target = [url.protocol, '//', url.host].join('');
    const temp = {
        ...incoming,
        target,
        url,
    };
    return createItem(temp);
}

export function createItem(incoming: ProxyItem): ProxyItem {
    return {
        ...incoming,
        proxyReq: [].concat(incoming.proxyReq).filter(Boolean),
        proxyRes: [].concat(incoming.proxyRes).filter(Boolean),
        proxyErr: [(err) => {/* noop */}].concat(incoming.proxyErr).filter(Boolean),
        options: {
            ...defaultHttpProxyOptions,
            ...incoming.options,
        },
    }
}
