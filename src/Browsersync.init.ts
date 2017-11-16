import {Observable, BehaviorSubject} from 'rxjs';
import serveStatic, {SSMiddlewarePayload} from './plugins/serveStatic';
import {Middleware} from './plugins/Server/server';
import clientJS from './plugins/clientJS';
import compression from './plugins/compression';
import {fromJS} from "immutable";
import {IActorContext} from "aktor-js/dist/ActorContext";
import {Options} from "./index";
import {RespModifier, RespModifierMiddlewareInput} from "./resp-modifier";
import {addMissingOptions} from "./options";
import {askForProxyMiddleware, getProxyOption, askForProxyOptions} from "./plugins/Proxy/proxy";
import {RewriteRule} from "./rewrite-rules";
import {ActorRef} from "aktor-js/dist/ActorRef";
import {ProxyOptions} from "./plugins/Proxy/Options.message";

const debug = require('debug')('bs:system');
const {of} = Observable;

export type GetActorFn = (name: string, factory: Function) => ActorRef;
function _getActor(context): GetActorFn {
    return (name, factory) => {
        const current = context.actorSelection(name);

        const actor = current.length
            ? current[0]
            : context.actorOf(factory, name);

        return actor;
    }
}

export function getOptionsAndMiddleware(context: IActorContext, options: Options): Observable<{middleware: Middleware[], options: Options}> {

    const getActor    = _getActor(context);
    const opts        = addMissingOptions(options);
    const proxyOption = getProxyOption(opts.get('proxy'));
    const proxyActor  = askForProxyOptions(getActor, proxyOption);

    return of(opts).flatMap((opts) => {
        if (!proxyOption.length) {
            return of(opts);
        }
        return proxyActor.flatMap((proxyResp: ProxyOptions.Response) => {
            const [errors, optsFromProxy] = proxyResp;
            if (errors && errors.length) {
                return Observable.throw(errors);
            }
            const updatedOptions = opts
                .updateIn(['rewriteRules'], prev => {
                    if (optsFromProxy.rewriteRules.length) {
                        return prev.concat(fromJS(optsFromProxy.rewriteRules));
                    }
                    return prev;
                })
                .update('scheme', scheme => {
                    if (optsFromProxy.scheme === 'https') {
                        return optsFromProxy.scheme;
                    }
                    return scheme;
                });
            return of(updatedOptions);
        })
    })
    .flatMap((opts): any => {

        const snippetRule: RewriteRule = opts.getIn(['snippetOptions', 'rewriteRule']).toJS();
        const optionRules = opts.get('rewriteRules').toJS().filter(Boolean);

        const rules = [snippetRule, ...optionRules];

        const respInput: RespModifierMiddlewareInput = {
            rules,
            options: opts,
        };

        const ssInput: SSMiddlewarePayload = {
            cwd: opts.get('cwd'),
            options: opts.get('serveStatic').toJS()
        };

        const proxyOption = getProxyOption(opts.get('proxy'));
        const proxyMiddleware = askForProxyMiddleware(getActor, proxyOption);

        return Observable.zip(
            Observable.zip(
                getActor('compression', compression).ask('middleware', opts.get('compression')),
                getActor('clientJS', clientJS).ask('middleware', opts),
                getActor('resp-mod', RespModifier).ask('middleware', respInput),
                getActor('serveStatic', serveStatic).ask('middleware', ssInput),
                proxyMiddleware.map(([, mw]) => mw),
            ).map(mws => {
                return mws.reduce((acc: Middleware[], item: Middleware[]) => acc.concat(item), [])
            }),
            Observable.of(opts),
            (middleware, options) => {
                return {
                    middleware,
                    options
                }
            }
        )
    })
}


